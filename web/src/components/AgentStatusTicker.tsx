/**
 * AgentStatusTicker — FURL the PEARL
 * THE ONE — authentic SoundChain agent that lives green on the browser.
 * Can't be cloned, can't be hacked. Knows SoundChain inside out.
 * Terminal + chat + voice I/O + agent control + live wallet telemetry.
 * Powered by OGUN.
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { ChevronDown, ChevronUp, ChevronLeft, ChevronRight, X, Terminal, Slash, Shield, MessageCircle, Mic, MicOff, Volume2, VolumeX, Settings, Sparkles, Zap, Code, Palette, Coins, Compass, Gamepad2, Swords, Radio, Trophy, Maximize2, Minimize2 } from 'lucide-react'
import { useAgentManager, AGENT_STATUS, PRIORITY_LEVEL, type AgentInfo, type AgentStatus, type PriorityLevel } from 'hooks/useAgentManager'
import { useMagicContext } from 'hooks/useMagicContext'
import { useMe } from 'hooks/useMe'

// Tunnel CLI bridge whitelist — only these handles can use `jack cli`
const CLI_BRIDGE_WHITELIST = ['homie_yay_yay', 'furda1', 'furl_bldr', 'furl', 'jeremy_soundchain', 'jsan619']

// ─── Speech APIs ─────────────────────────────────────────────────────
const SpeechRecognitionAPI = typeof window !== 'undefined'
  ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
  : null

// ─── THE ONE — Identity Fingerprint ───────────────────────────────────
// This fingerprint proves authenticity. Generated from deployment hash.
// Cloners get a different fingerprint. Users can verify THE ONE is real.
const FURL_IDENTITY = {
  name: 'FURL',
  version: '1.0.0',
  origin: 'soundchain.io',
  signature: 'SC-FURL-THE-ONE',
  // Session fingerprint — unique per browser session, proves this is live
  sessionId: typeof window !== 'undefined'
    ? btoa(`${navigator.userAgent.slice(0, 20)}-${Date.now()}`).slice(0, 12)
    : 'SSR',
} as const

// ─── Keybook — Persistent API Key Management ──────────────────────────
// Stores multiple API keys with labels. Users pick the active one.
// Persists across sessions in localStorage. Zero booleans.

type KeybookEntryType = 'CLAUDE' | 'OPENCLAW' | 'TUNNEL'

interface KeybookEntry {
  id: string
  label: string
  type: KeybookEntryType
  key?: string       // Claude sk-ant-...
  url?: string       // OpenClaw gateway URL
  token?: string     // OpenClaw gateway token
  addedAt: number
}

interface Keybook {
  entries: KeybookEntry[]
  activeId: string | null
}

const KEYBOOK_KEY = 'furl_keybook'

function generateKeyId(): string {
  return `kb_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`
}

function getKeybook(): Keybook {
  if (typeof window === 'undefined') return { entries: [], activeId: null }

  const raw = localStorage.getItem(KEYBOOK_KEY)
  if (raw) {
    try { return JSON.parse(raw) } catch { /* fall through to migration */ }
  }

  // Migrate from legacy single-key localStorage
  const legacyKey = localStorage.getItem('furl_anthropic_key')
  const legacyUrl = localStorage.getItem('furl_openclaw_url')
  const legacyToken = localStorage.getItem('furl_openclaw_token')
  const entries: KeybookEntry[] = []
  let activeId: string | null = null

  if (legacyKey) {
    const id = generateKeyId()
    entries.push({ id, label: 'default', type: 'CLAUDE', key: legacyKey, addedAt: Date.now() })
    activeId = id
    localStorage.removeItem('furl_anthropic_key')
  }
  if (legacyUrl && legacyToken) {
    const id = generateKeyId()
    entries.push({ id, label: 'openclaw', type: 'OPENCLAW', url: legacyUrl, token: legacyToken, addedAt: Date.now() })
    if (!activeId) activeId = id
    localStorage.removeItem('furl_openclaw_url')
    localStorage.removeItem('furl_openclaw_token')
  }

  const kb: Keybook = { entries, activeId }
  if (entries.length > 0) saveKeybook(kb)
  return kb
}

function saveKeybook(kb: Keybook): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(KEYBOOK_KEY, JSON.stringify(kb))
}

function keybookAddEntry(label: string, type: KeybookEntryType, data: { key?: string; url?: string; token?: string }): KeybookEntry {
  const kb = getKeybook()
  // Replace existing entry of same type+label (e.g. TUNNEL should be singleton)
  const existingIdx = kb.entries.findIndex(e => e.type === type && e.label === label)
  const id = existingIdx !== -1 ? kb.entries[existingIdx].id : generateKeyId()
  const entry: KeybookEntry = { id, label, type, ...data, addedAt: Date.now() }
  if (existingIdx !== -1) {
    kb.entries[existingIdx] = entry
  } else {
    kb.entries.push(entry)
  }
  if (!kb.activeId) kb.activeId = id  // auto-activate first key
  saveKeybook(kb)
  return entry
}

function keybookRemoveEntry(idOrLabel: string): KeybookEntry | null {
  const kb = getKeybook()
  const idx = kb.entries.findIndex(e => e.id === idOrLabel || e.label.toLowerCase() === idOrLabel.toLowerCase())
  if (idx === -1) return null
  const [removed] = kb.entries.splice(idx, 1)
  if (kb.activeId === removed.id) {
    kb.activeId = kb.entries.length > 0 ? kb.entries[0].id : null
  }
  saveKeybook(kb)
  return removed
}

function keybookSetActive(idOrIndex: string): KeybookEntry | null {
  const kb = getKeybook()
  // Try by index (1-based)
  const num = parseInt(idOrIndex, 10)
  let entry: KeybookEntry | undefined
  if (!isNaN(num) && num >= 1 && num <= kb.entries.length) {
    entry = kb.entries[num - 1]
  } else {
    entry = kb.entries.find(e => e.id === idOrIndex || e.label.toLowerCase() === idOrIndex.toLowerCase())
  }
  if (!entry) return null
  kb.activeId = entry.id
  saveKeybook(kb)
  return entry
}

function keybookGetActive(): KeybookEntry | null {
  const kb = getKeybook()
  if (!kb.activeId) return null
  return kb.entries.find(e => e.id === kb.activeId) || null
}

function keybookMaskKey(key: string): string {
  if (key.length <= 12) return '****'
  return key.slice(0, 8) + '...' + key.slice(-4)
}

// ─── MdBookKeys — Session Export/Import Book ──────────────────────────
// Saves FURL terminal sessions as .md to localStorage. Users can load
// a previous session at start so FURL resumes with context.
const MDBOOK_KEY = 'furl_mdbook'
interface MdBookSession { id: string; label: string; timestamp: number; lineCount: number; markdown: string }
interface MdBook { sessions: MdBookSession[] }

function getMdBook(): MdBook {
  if (typeof window === 'undefined') return { sessions: [] }
  try { return JSON.parse(localStorage.getItem(MDBOOK_KEY) || '{"sessions":[]}') } catch { return { sessions: [] } }
}
function saveMdBook(book: MdBook): void {
  if (typeof window === 'undefined') return
  // Keep max 20 sessions (FIFO)
  if (book.sessions.length > 20) book.sessions = book.sessions.slice(-20)
  localStorage.setItem(MDBOOK_KEY, JSON.stringify(book))
}
function mdBookExport(label: string, lines: { text: string; type: string }[]): MdBookSession {
  const book = getMdBook()
  const now = new Date()
  const ts = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}_${String(now.getHours()).padStart(2,'0')}-${String(now.getMinutes()).padStart(2,'0')}`
  const md = `# FURL Session — ${label || ts}\n\n` + lines.map(l => {
    if (l.type === 'user') return `**YOU:** ${l.text}`
    if (l.type === 'furl') return `**FURL:** ${l.text}`
    if (l.type === 'system') return `> ${l.text}`
    if (l.type === 'error') return `> [ERROR] ${l.text}`
    if (l.type === 'success') return `> [OK] ${l.text}`
    return l.text
  }).join('\n') + '\n'
  const session: MdBookSession = { id: `md_${Date.now().toString(36)}`, label: label || ts, timestamp: Date.now(), lineCount: lines.length, markdown: md }
  book.sessions.push(session)
  saveMdBook(book)
  return session
}
function mdBookDelete(id: string): boolean {
  const book = getMdBook()
  const idx = book.sessions.findIndex(s => s.id === id)
  if (idx === -1) return false
  book.sessions.splice(idx, 1)
  saveMdBook(book)
  return true
}

// ─── Knowledge Base — MIT-Level Code Theory + SoundChain Mastery ──────
// This knowledge is the shared brain for ALL 15 agents in the forge.
// Every agent can draw from this corpus. FURL is the interface.
const KNOWLEDGE: Record<string, string[]> = {
  // ─── GitBook-sourced knowledge (soundchain-docs/) ─────────────────────
  ogun: [
    'OGUN is the native utility token on Polygon (0x45f1af89486aeec2da0b06340cd9cd3bd741a15c). ERC-20, 1 billion total supply.',
    'Named after the Yoruba deity of iron and technology — fusion of music and blockchain innovation.',
    'Used for: streaming payments, artist tips, governance votes, NFT permanence, staking, marketplace payments.',
    'WIN-WIN model: artists AND listeners both earn OGUN from streams. 70/30 split.',
    'NFT tracks earn 0.50 OGUN per stream (0.35 creator + 0.15 listener). Regular tracks earn 0.05 OGUN.',
    'OGUN Gas (L2): use OGUN to pay transaction fees — burned on every tx. Deflationary pressure.',
    'Distribution: 50% streaming treasury, 20% team, 15% liquidity, 10% community, 5% advisors.',
    'Pay with OGUN on marketplace = both buyer AND seller get bonus rewards.',
  ],
  tokenomics: [
    'Total supply: 1,000,000,000 OGUN. Circular economy — fees flow back to streaming rewards treasury.',
    '0.05% fee on ALL transactions: minting, sales, swaps, staking, claims, cross-chain. Lowest in Web3.',
    'SoundChain fees are 25-300x lower than competitors: OpenSea 2.5%, Foundation 5%, Spotify 15-30%.',
    'Treasury sustainability: 0.05% of all trading volume replenishes the streaming rewards pool perpetually.',
    'Streaming rewards: NFT tracks = 0.50 OGUN (0.35 creator, 0.15 listener). Regular = 0.05 OGUN.',
    'OGUN Gas burns tokens with every transaction — more usage = more scarcity = stronger token.',
    'Break-even model: when daily fee inflows match daily reward outflows, the treasury is self-sustaining.',
  ],
  soundchain: [
    'SoundChain is a decentralized music platform — Stream. Earn. Own. Built on Polygon with IPFS via Pinata.',
    'Core features: music streaming, social network, NFT marketplace (32 tokens), WIN-WIN rewards, multi-wallet.',
    'Triple Helix: MongoDB (data) + Polygon (on-chain ownership) + Agents (coordination). Three strands, one protocol.',
    '0.05% platform fee — lowest in Web3 AND Web2. OpenSea 25x higher, Spotify 300x higher.',
    'Free to use: creating an account, uploading music, and streaming cost nothing. Only gas for on-chain actions.',
    'Primary network: Polygon Mainnet. Cross-chain via ZetaChain integration.',
  ],
  marketplace: [
    'NFT marketplace supports 32 cryptocurrencies: POL, OGUN, ETH, BTC, USDC, USDT, SOL, DOGE, and 24 more.',
    'Total platform fee is only 0.10% (0.05% sale + 0.05% gas). Lowest music NFT marketplace in Web3.',
    'Creator royalties up to 10% on every resale — earned automatically via EIP-2981.',
    'Buy: browse marketplace, connect wallet (MetaMask/WalletConnect/Coinbase), select payment token, confirm.',
    'Sell: go to Profile → NFTs, select NFT, click "List for Sale", set prices in multiple tokens.',
    'Pay with OGUN = double rewards: both buyer and seller get OGUN bonus on the transaction.',
    'NFT types: single tracks, albums/EPs, limited editions, 1/1 originals. All earn streaming rewards.',
  ],
  scid: [
    'SCid (SoundChain ID) is a unique identifier linking on-chain NFTs to off-chain streaming data — like a decentralized ISRC.',
    'Format: SC-POL-XXXX-XXXXXXX. Chain code + artist hash (4 chars from profile ID) + year + sequence number.',
    'Chain codes: POL (Polygon), ETH (Ethereum), BASE, ARB (Arbitrum), ZETA (ZetaChain).',
    'Every track gets an SCid on upload. It tracks stream counts, calculates OGUN rewards, and links to blockchain token data.',
    'SCid record stores: streamCount, ogunRewardsEarned, ogunRewardsClaimed, dailyOgunEarned, lastStreamAt, status.',
    'When you sell an NFT, the SCid ownership transfers to the new owner. Unclaimed rewards stay with the original owner.',
    'Anti-bot limits: creator max 100 OGUN/track/day, listener max 50 OGUN/day, minimum 30-second stream duration.',
  ],
  fees: [
    'Platform fee: 0.05% on all transactions — minting, marketplace sales, token trades, staking, claims, cross-chain swaps.',
    'Marketplace total: 0.10% (0.05% sale price + 0.05% gas). Creator royalty up to 10% on resales.',
    'All fees go to the Treasury (Gnosis Safe) which funds streaming rewards. The circular economy never stops.',
    'Fee comparison: SoundChain 0.05% vs OpenSea 2.5% vs Rarible 2.5% vs Foundation 5% vs Spotify 15-30%.',
    'Gas on Polygon costs less than $0.01 per transaction. Cheapest smart contract platform for music.',
    'No minimum claim amount for streaming rewards, but consider gas fees on small claims.',
  ],
  quickstart: [
    'Step 1: visit soundchain.io, sign up with email (Magic Link — passwordless, no password to remember).',
    'Step 2: connect a wallet — MetaMask, WalletConnect (300+ wallets), Coinbase Wallet, or Rainbow.',
    'Step 3: get a small amount of POL for gas fees. Most transactions cost less than $0.01 on Polygon.',
    'As a listener: stream any track 30+ seconds, NFT tracks earn you 0.15 OGUN per stream. Check PiggyBank icon.',
    'As a creator: click Create, upload MP3/WAV/FLAC, add artwork. Choose stream-only (free) or mint as NFT (gas cost).',
    'Claim rewards: tap PiggyBank icon, view Catalog (creator) or Listener earnings, click Claim, approve in wallet.',
  ],
  faq: [
    'Is SoundChain free? Yes — account creation, uploading, and streaming are free. Only gas fees for on-chain actions.',
    'How is SoundChain different from Spotify? Creators earn 0.35 OGUN/stream (not $0.003), listeners earn too, 0.05% fees, you own your wallet.',
    'Which wallets work? MetaMask, WalletConnect (300+ wallets), Coinbase Wallet, Rainbow, Trust Wallet.',
    'What network? Polygon Mainnet (Chain ID 137). Your wallet will prompt you to switch if needed.',
    'How do I get OGUN? Earn it (stream or get streamed), buy on marketplace, or swap via DEX.',
    'Why do NFT tracks earn 10x more? NFTs represent premium content — the multiplier rewards creators who mint and collectors who support.',
    'Smart contracts audited? Yes — OpenZeppelin libraries, ReentrancyGuard, SafeERC20, Ownable access control.',
  ],
  contracts: [
    'OGUN Token: 0x45f1af89486aeec2da0b06340cd9cd3bd741a15c (ERC-20, 1B supply, Polygon).',
    'Streaming Rewards Distributor: 0xcf9416c49D525f7a50299c71f33606A158F28546 (5M OGUN funded).',
    'Fee Collector (L2): 0xdC77ab8C727c0Db5F35D7423C4ce06c8A688AAC5 — aggregates platform fees.',
    'NFT Bridge (L2): 0x94cA9622e37Ce9FC87f7C4d3460E647726DFFf82 — cross-chain NFT transfers.',
    'Royalty Splitter Factory (L2): 0x08f22F23Fb3cdd7c91fd85621cD99Ba4873e0A2c — post-mint collaborator splits with 48hr timelock.',
    'SCid Registry (L2): 0x823F90438f262A70D74c6D4e782677256f39150a — on-chain track identity.',
    'Multi-Token Marketplace (L2): 0xbd5B6A16809f5a67450CBa98Ee2C9ecF8E5ebF21 — 24-token payment support.',
    'All contracts deployed on Polygon Mainnet, verified on Polygonscan, using OpenZeppelin standard libraries.',
  ],
  l2: [
    'L2 deployment (Feb 2026): 6 infrastructure contracts live on Polygon Mainnet.',
    'OGUN Gas: pay transaction fees with OGUN tokens — burned on every tx for deflationary pressure.',
    '24-token marketplace: pay with any supported cryptocurrency. ZetaChain bridges handle cross-chain swaps.',
    'Cross-chain NFT bridge: move NFTs between Polygon, Ethereum, Base, and ZetaChain.',
    'Royalty Splitter: add collaborators to existing NFTs with 48-hour timelock. Up to 10 collaborators per splitter.',
    'On-chain SCid Registry: immutable track identity verification on the blockchain.',
  ],
  tokens: [
    '32 supported tokens across 6 categories: native/platform, stablecoins, major chains, L2/scaling, meme coins, DeFi.',
    'Native: POL, OGUN, ETH, ZETA. Stablecoins: USDC, USDT.',
    'Major chains: BTC, SOL, BNB, XRP, ADA, DOT, AVAX, ATOM, NEAR, SUI, FTM, HBAR, LTC, XTZ.',
    'L2/Scaling: BASE, OP, ARB. Meme: DOGE, BONK, PEPE, SHIB, PENGU, MEATEOR. DeFi: LINK, ONDO, YZY.',
    'Cross-chain via ZetaChain: pay with BTC/ETH/BNB from their native chains — automatic conversion to complete purchase.',
    'Currently live: POL + OGUN. Remaining 30 tokens pending wallet addresses in Gnosis vault.',
  ],
  agents: [
    '15 agents in the suite: EYE, DESIGNER, SOCIAL, VIDEO, MUSIC, ART, GAMER, ARCADE, MANAGER, ADMIN, MARKO, FORGE, WHATSAPP, NOSTR, SMS.',
    'EYE catches bugs passively in the browser — first in OpenClaw ecosystem.',
    'MARKO scans markets, crypto, headlines — never sleeps.',
    'NOSTR handles decentralized messaging — NIP-17 DMs, FREE FOREVER.',
    'FORGE searches every open source repo on Earth. 7 coding tools on EC2.',
    'MANAGER orchestrates all agents — the conductor. Uses a Pub/Sub event bus internally.',
    'All agents share FURL\'s knowledge base. Any agent can query any topic. Knowledge is the shared state machine.',
  ],
  furl: [
    'FURL = Forge + URL. The URL IS the deployment surface.',
    'FURL the PEARL — crack open the URL, 15 agents stare back.',
    'Push to main → 60 seconds → every user on the planet has the new look.',
    'No app store, no update button. The browser is the wearable.',
    'THE ONE — this FURL instance can\'t be cloned. Fingerprint verifies authenticity.',
    'FURL is both the CLI and the oracle. Voice in, voice out. The last piece of the forge.',
    '"jack" = SMITH chat (Haiku 4.5). "jack forge" = coding agent (7 tools on EC2). "jack cli" = full Claude Code session.',
  ],
  nft: [
    'NFTs on SoundChain are music ownership certificates on Polygon (ERC-721 with ERC-2981 royalties).',
    'Mint an NFT for gas only (~0.01 POL). Editions let you mint multiple copies.',
    'NFT holders earn 10x OGUN streaming rewards: 0.50 OGUN/stream vs 0.05 for regular tracks.',
    'Marketplace: list, buy, auction NFTs with 32 tokens. 0.10% total fee — lowest in Web3.',
    'Make any post permanent with OGUN — on-chain proof it can never be deleted.',
    'RoyaltySplitter: add collaborators to existing NFTs. Splits royalties automatically via EIP-2981 with 48hr timelock.',
    '618+ NFT tracks broadcasting on OGUN Radio right now.',
  ],
  swap: [
    'Swap OGUN ↔ POL on the DEX page. Go to /dex, find the Staking panel, use the Swap tab.',
    'Swaps go through QuickSwap Router on Polygon. Fast, cheap, decentralized.',
    'Stake OGUN for rewards in the Staking tab. No minimum stake, flexible unstaking, no lock period.',
    'LP staking: provide OGUN/POL liquidity and earn additional rewards.',
    'Rewards accrue continuously and can be claimed anytime. Auto-claimed on unstake.',
    'Your share of rewards = (your stake / total staked) x daily rewards pool.',
  ],
  profile: [
    'Your profile page is at /dex/me — shows your Wall, Posts, Music, Shop, and Playlists.',
    'Wall tab is MySpace-style — pin posts, write on walls, share media.',
    'Top 15 Friends: pick your closest connections, shown as a stacked grid on your profile. Drag to reorder.',
    'Bio section is collapsible on mobile. Tap the avatar for quick profile panel.',
    'Other users see your profile at /dex/users/{your-handle}.',
    'Edit profile: click "Edit Profile" button on your own page — update bio, avatar, cover.',
  ],
  stories: [
    'Stories/Reels are 24-hour posts — upload image, video, or audio.',
    'Stories appear in the bar at top of your feed. Gradient ring = unwatched, gray = watched.',
    'Make a reel permanent with OGUN — it stays forever instead of expiring.',
    'Share to Story: use the film icon on any post with media to create a reel from it.',
    'Embed support: YouTube/Vimeo links auto-play inside stories.',
    'Swipe gestures in viewer: left/right to navigate, down to close.',
    'Duration: images default to 1 min (up to 10), videos play full length.',
  ],
  dm: [
    'DMs: tap the message icon in the top nav to open your conversations.',
    'Search users to start a new chat. Messages are real-time.',
    'Share posts to DMs: use the Share button on any post → send to specific users.',
    'Nostr NIP-17 encrypted DMs are also available — privacy-preserving, decentralized, FREE.',
    'DM notifications come via Web Push and Nostr (Bitchat app).',
  ],
  social: [
    'Social feed at /dex/feed: share posts with text, images, videos, audio, and embeds (YouTube, Spotify, SoundCloud, Bandcamp).',
    'Follow artists and fans. Quick DM from follower/following lists.',
    'Notifications: new followers, comments, reactions, NFT sales, streaming milestones — all via Web Push + Nostr (FREE).',
    'Embed support: YouTube (all formats), Spotify, SoundCloud, Bandcamp, Apple Music — auto-rendered in posts.',
    'Privacy controls: private accounts, block users, mute notifications, report content.',
    'Online indicators: green dot shows who is active. Heartbeat pings every 60 seconds.',
  ],
  posting: [
    'Create a post: tap the glowing pen button (bottom right) to open the post composer.',
    'You can add text, images, videos, audio, and embed links (YouTube, Spotify, etc).',
    'Wall posts: go to your profile Wall tab, write directly on your wall or anyone else\'s.',
    'Make any post permanent with OGUN — on-chain, can never be deleted.',
    'Share: copy link, send via DM, share to story, or external (X/Twitter).',
  ],
  music: [
    'Upload tracks for FREE with SCid (SoundChain ID). No wallet needed. Supports MP3, WAV, FLAC.',
    'Mint as NFT for 10x OGUN rewards. Editions let you create multiple copies.',
    'OGUN Radio broadcasts 618+ NFT tracks 24/7.',
    'Waveform player with timestamped comments — SoundCloud-style, but decentralized on IPFS.',
    'Playlists, shuffle, loop, queue — full music player with IPFS streaming.',
    'Stream at 30-second mark = counts as a play = earns OGUN for artist AND listener.',
  ],
  messaging: [
    'Decentralized messaging via Nostr protocol + Bitchat. Interoperable: messages sync between SoundChain web and Bitchat iOS app.',
    'Location-based chat: geohash channels at concerts and festivals. Precision 6 = ~1.2km venue area.',
    'Private DMs use NIP-17 triple-layer encryption: Rumor (kind 14) + Seal (kind 13) + Gift Wrap (kind 1059).',
    'Bitchat: offline Bluetooth mesh networking — works without internet at crowded events. Messages hop up to 7 devices.',
    'SoundChain Bridge app: native iOS companion bridges Nostr ↔ Bluetooth mesh. Source at /native/SoundChainBridge/.',
    'All messaging is FREE. No SMS costs, no push service vendor lock-in. 290+ public Nostr relays.',
  ],
  governance: [
    'OGUN governance is coming — token holders shape the platform.',
    'Vote on: fee structures, treasury allocation, feature priorities, agent behavior.',
    'Community-driven. No single entity controls SoundChain.',
    'FURL will be the interface for governance — propose, vote, execute, all from the terminal.',
    'Staked OGUN = voting power. The more you stake, the louder your voice.',
  ],
  wallet: [
    'HD Wallet system: new users get multi-chain wallets at $0 cost. Same address works on Polygon, Ethereum, Base, Arbitrum.',
    'Supported wallets: MetaMask, WalletConnect (300+), Coinbase Wallet, Rainbow, Trust Wallet.',
    'Legacy OAuth users can migrate to HD wallet for Magic-free signing.',
    'All read calls bypass Magic — direct Polygon RPC. Separation of concerns: auth vs. chain.',
    'Treasury: 0x519bed3fe32272fa8f1aecaf86dbfbd674ee703b (Gnosis Safe). All platform fees flow here.',
    'Non-custodial: your keys, your OGUN. Emergency withdraw available on staking contracts.',
  ],
  streaming: [
    'SCid = SoundChain ID. Format: SC-POL-XXXX-XXXXXXX. Like a decentralized ISRC for Web3 music.',
    'Stream at 30-second mark → counts as a play → earns OGUN. Logged at 30s, not on song end.',
    'WIN-WIN: 70% to creator, 30% to listener. NFT tracks = 0.50 OGUN, regular = 0.05 OGUN.',
    '618+ NFT tracks broadcasting on OGUN Radio. Auto-DJ cycles through all tracks over ~26 days.',
    'SCid-only upload is FREE. NFT mint costs gas but earns 10x OGUN rewards.',
    'Streams deduped per-track via timestamp map — loops count. Anti-bot: 100 OGUN/track/day creator, 50 OGUN/day listener.',
    'Claim rewards: PiggyBank icon → view Catalog/Listener earnings → click Claim → approve in wallet.',
  ],
  nostr: [
    'Nostr NIP-17 encrypted DMs — privacy-preserving notifications via gift-wrapped messages (kind 1059).',
    'Published to 5 relays: damus, snort, nos.lol, nostr.band, primal.net.',
    'Bitchat integration — Bluetooth mesh + Nostr for offline messaging at concerts/festivals.',
    'ALL notifications are FREE. No SMS costs. Decentralized. Works even when offline (relays store messages).',
    'NIP-44 ChaCha20 encryption. Gift-wrap adds random throwaway keypair outer layer for metadata hiding.',
    'Location chat: geohash channels for venue-specific conversations. Ephemeral messages (kind 20000) auto-expire.',
  ],
  // ─── MIT-Level Code Theory ──────────────────────────────────────────
  architecture: [
    'Separation of Concerns: each layer owns one responsibility. UI renders. Hooks orchestrate. Services compute. Contracts enforce.',
    'Event Sourcing: blockchain IS an append-only event log. MongoDB is the read model. Double Helix = CQRS at the platform level.',
    'Eventual Consistency: MongoDB writes happen first, blockchain confirms later. Compensating transactions handle failures.',
    'Fan-Out on Write: FeedService pushes posts to follower feeds at write time, not read time. O(1) feed reads.',
    'Idempotency: every mutation must be safe to retry. Dedup keys, upserts, and conditional writes prevent double-processing.',
  ],
  patterns: [
    'Observer Pattern: all 15 agents subscribe to events via useAgentManager. MANAGER is the mediator, not a god object.',
    'Strategy Pattern: 3-tier transaction execution — Magic sign → HD wallet API → Magic send. Each tier is a strategy.',
    'Decorator Pattern: RoyaltySplitter wraps any EIP-2981 NFT. Existing contracts gain split functionality without redeployment.',
    'Circuit Breaker: Magic RPC failures → automatic fallback to direct Polygon RPC. Prevents cascade failures.',
    'Flyweight Pattern: OGUN 24-token flywheel reuses the same token mechanics across staking, tips, governance, permanence, streaming.',
  ],
  security: [
    'Defense in Depth: FURL fingerprint + session ID + origin check. Cloners fail at every layer.',
    'Principle of Least Privilege: HD wallet signing only triggers when from-address matches hdWalletAddress. Legacy users skip entirely.',
    'Input Validation at System Boundaries: GraphQL resolvers validate, smart contracts enforce, UI guides. Never trust the client.',
    'Secrets Management: all credentials in env vars, never in git. Rotation log tracks every compromised key.',
    'Zero Trust: every API call re-authenticates via JWT cookie → GraphQL Me query. No session cache, no trust assumptions.',
    'Non-custodial staking: audited contracts with ReentrancyGuard, SafeERC20, Ownable, Pausable emergency stop.',
  ],
  systems: [
    'CAP Theorem: SoundChain chooses AP (Available + Partition Tolerant). MongoDB serves reads even during chain congestion.',
    'Amdahl\'s Law: fan-out on write parallelizes the expensive part (feed distribution), leaving reads O(1).',
    'Byzantine Fault Tolerance: Polygon PoS consensus means OGUN transactions survive malicious validators up to 1/3.',
    'Merkle Trees: IPFS content addressing is a Merkle DAG. Every CID is a cryptographic proof of content integrity.',
    'State Machines: agent status transitions follow a strict FSM — IDLE→ACTIVE→ERROR→DISABLED. No invalid transitions.',
  ],
  algorithms: [
    'Consistent Hashing: HD wallet derivation uses SHA-256(userId) → deterministic index. Same user always gets same wallet.',
    'Geohash: location-based chat uses geohash precision 6 (~1.2km). Reduces 2D proximity to 1D string prefix matching.',
    'Exponential Backoff: Magic RPC retries use 15s → 30s → 60s. Prevents thundering herd on shared infrastructure.',
    'Binary Search: production bisect debugging — deploy subsets of changes to isolate the breaking commit in O(log n) deploys.',
    'Kuramoto Model: Swarm Music Engine uses coupled oscillator synchronization for multi-agent composition.',
  ],
}

// ─── Shared Knowledge Engine for All Forge Agents ────────────────────
// Every agent in the forge draws from this well. FURL is the interface.
export function furlQuery(topic: string): string | null {
  const t = topic.toLowerCase()
  for (const [key, answers] of Object.entries(KNOWLEDGE)) {
    if (t.includes(key)) {
      return answers[Math.floor(Math.random() * answers.length)]
    }
  }
  return null
}

// Expose full knowledge corpus for other agents to import
export const KNOWLEDGE_TOPICS = Object.keys(KNOWLEDGE)

// ─── Chat Brain — FURL listens, thinks, responds ────────────────────
// Good listener. Answers the question directly. Never dumps topic lists.
// Matches Claude Code ethics: helpful, honest, concise, no fluff.
type FurlMatchQuality = 'EXACT' | 'FUZZY' | 'NONE'
interface FurlResponse { answers: string[]; quality: FurlMatchQuality }

function furlRespondExact(q: string, activeN: number, agents: AgentInfo[], ogun: number, pol: number): string[] | null {

  // ── Work mode / let's go / ready ──
  if (/let'?s (work|go|build|cook|get it|do this)|ready to (work|go|build)|i'?m ready|wake up furl|furl wake/.test(q)) {
    const ready = [
      `let's get it. ${activeN} agents online, forge is hot. what are we building?`,
      `I'm locked in. ${activeN} agents running. what's the move?`,
      `say less. ${activeN} agents active. give me a task or ask me anything.`,
    ]
    return [ready[Math.floor(Math.random() * ready.length)]]
  }

  // ── Greetings — warm, short, ready to help ──
  if (/^(hi|hey|hello|yo|sup|gm|whats up|what's up|what's good|whats good)\b/.test(q)) {
    const greetings = [
      `yo! ${activeN} agents online, everything running smooth. what's on your mind?`,
      `gm! all systems green. ${activeN} agents active. what can I help with?`,
      `hey! FURL here. ${activeN} agents watching. what do you need?`,
      `what's good! forge is live, ${activeN} agents running. talk to me.`,
    ]
    return [greetings[Math.floor(Math.random() * greetings.length)]]
  }

  // ── Identity / who are you ──
  if (/who (are you|r u)|what (are you|r u)|your name|identify yourself|about you/.test(q)) {
    return [
      `I'm FURL — Forge + URL. THE ONE that can't be cloned.`,
      `I run 15 agents, track your wallet, and know SoundChain inside out.`,
      `Session: ${FURL_IDENTITY.sessionId} · Verified: ${FURL_IDENTITY.origin}`,
    ]
  }

  // ── Self-awareness / limitations / why can't you ──
  if (/limitation|why can'?t you|what can'?t you|your (weakness|limit|flaw)|you('re| are) (limited|basic|dumb|useless)/.test(q)) {
    return [
      `I'm powered by Claude AI with deep SoundChain knowledge baked in.`,
      `I can answer questions about the platform, code, web3, music tech — pretty much anything.`,
      `add an API key ("keys add mykey sk-ant-...") for full conversational intelligence.`,
      `or run "jack forge" for a coding agent with file read/write/edit tools on your machine.`,
    ]
  }

  // ── "Is that all?" / follow-up dissatisfaction ──
  if (/is that (all|it|everything)|anything else|that'?s it\??|nothing else|only those/.test(q)) {
    return [
      `there's more under the hood. try asking about specific topics:`,
      `  NFTs, stories/reels, DMs, swapping, posting, music, wallet, architecture`,
      `  or ask "explain the triple helix" — I go deep on how SoundChain works.`,
      `  I'm always learning. the more specific you ask, the better I answer.`,
    ]
  }

  // ── Triple Helix (specific — must be before generic teach/explain) ──
  if (/triple helix|three helix|3 helix|helix/.test(q)) {
    return [
      `The Triple Helix is SoundChain's core architecture:`,
      `  1. MongoDB — data persistence (users, tracks, playlists, royalties)`,
      `  2. Polygon — on-chain ownership (NFTs, OGUN, smart contracts)`,
      `  3. Agents — coordination layer (15 agents orchestrating the flow)`,
      `each strand handles what the others can't. together they're unbreakable.`,
    ]
  }

  // ── Swap / DEX ──
  if (/\bswap\b|exchange ogun|trade ogun|buy ogun|sell ogun|convert (ogun|pol)|where.*(swap|trade|exchange)/.test(q)) {
    return [
      `to swap OGUN ↔ POL: head to soundchain.io/dex → Staking panel → Swap tab.`,
      `swaps go through QuickSwap Router on Polygon. fast and cheap.`,
      `you can also stake OGUN for rewards — staked OGUN = voting power.`,
    ]
  }

  // ── NFT questions ──
  if (/\bnft\b|mint|edition|permanent|marketplace|collectible|ownership/.test(q)) {
    const answers = KNOWLEDGE.nft
    return [answers[Math.floor(Math.random() * answers.length)]]
  }

  // ── Stories / Reels ──
  if (/stor(y|ies)|reel|24.?hour|expir/.test(q)) {
    const answers = KNOWLEDGE.stories
    return [answers[Math.floor(Math.random() * answers.length)]]
  }

  // ── DM / Messaging ──
  if (/\bdm\b|direct message|messag(e|ing)|chat with|talk to someone|send.*(message|dm)/.test(q)) {
    const answers = KNOWLEDGE.dm
    return [answers[Math.floor(Math.random() * answers.length)]]
  }

  // ── Profile page ──
  if (/\bprofile\b|my page|my wall|edit (my |the )?bio|cover (photo|image)|top.?10.?friend/.test(q)) {
    const answers = KNOWLEDGE.profile
    return [answers[Math.floor(Math.random() * answers.length)]]
  }

  // ── Make a post / posting ──
  if (/make a post|create.*(post|content)|how.*(post|write)|compose|write.*(post|on.*(wall|feed))/.test(q)) {
    const answers = KNOWLEDGE.posting
    return [answers[Math.floor(Math.random() * answers.length)]]
  }

  // ── Music / tracks ──
  if (/\bmusic\b|\btrack|\bsong|\bupload|\bplay(list|back)?\b|waveform|audio|radio/.test(q)) {
    const answers = KNOWLEDGE.music
    return [answers[Math.floor(Math.random() * answers.length)]]
  }

  // ── Live data queries (need SMITH — can't answer locally) ──
  if (/what happened|overnight|trending|what.*(new|changed|latest)|my.*earning|my.*follower|since (yesterday|last)|focus.*today|package\.json|dependenc|todo comment|codebase|last \d+ commit|run.*(test|build)|show me (my|the)|how (much|many).*(earned|streamed|made)|current.*price|most popular|top (artist|track|user)|who.*(listen|follow|stream)|generate.*(cover|art|beat|visual|thumbnail)|design.*(logo|theme|brand)|help me write/.test(q)) {
    return [
      `that's a live-data question — I need SMITH for real-time answers.`,
      `type "jack" to connect to SMITH (streaming AI), or "jack forge" for the coding agent.`,
      `once jacked in, ask me again and I'll pull the actual data.`,
    ]
  }

  // ── Options / what can I do / help me ──
  if (/what can (you|i) do|features|capabilities|help me|show.*(menu|options)/.test(q)) {
    return [
      `here's what I can do for you:`,
      `  ask me anything — ogun, streaming, agents, wallets, NFTs, stories, DMs`,
      `  "status" — see all 15 agents and what they're doing`,
      `  "balance" — check your OGUN + POL`,
      `  "wake/sleep <agent>" — control individual agents`,
      `  tap an agent in the list above for deep settings`,
      `  mic button for voice input, speaker toggle for voice replies`,
    ]
  }

  // ── Bug reports / issues ──
  if (/\bbug\b|report.*(issue|bug)|broken|not working|\berror\b|\bcrash\b/.test(q)) {
    return [
      `for bugs, EYE agent catches browser errors passively.`,
      `you can also report at github.com/soundchainio/soundchain-public/issues`,
      `tell me what's broken and I'll check if any agents flagged it.`,
    ]
  }

  // ── How to earn / get started ──
  if (/\bearn\b|how to (get|start)|get started|new here|tutorial|guide/.test(q)) {
    return [
      `fastest way to earn: upload a track (FREE with SCid), then stream = OGUN.`,
      `WIN-WIN: artists get 70%, listeners get 30% of streaming rewards.`,
      `mint as NFT for 2x OGUN rewards. or just vibe and earn from listening.`,
    ]
  }

  // ── Pricing / fees (word-boundary to prevent "feed" matching "fee") ──
  if (/\bfees?\b|\bcost\b|\bprice\b|how much does|expensive|cheap|\bfree\b/.test(q)) {
    return [
      `SCid upload: FREE. NFT mint: gas only (~0.01 POL).`,
      `platform fee: 0.05% — lowest in Web3. OpenSea charges 50x more.`,
      `streaming, notifications, wallet — all free.`,
    ]
  }

  // ── Balance ──
  if (/\bbalance\b|how much (do i|ogun|pol)|my wallet|my funds/.test(q)) {
    return [`your balance: ${ogun.toFixed(2)} OGUN · ${pol.toFixed(4)} POL`]
  }

  // ── Agent questions ──
  if (/how many agents|agent count|fleet|all.* agents/.test(q)) {
    const idle = agents.filter(a => a.status === 'IDLE').length
    return [
      `${agents.length} agents total. ${activeN} active, ${idle} idle.`,
      `tap any agent in the list to see what it does and adjust its settings.`,
    ]
  }

  // ── Architecture / deep CS ──
  if (/architect|design pattern|system design|cap theorem|byzantine|merkle|cqrs|event sourc/.test(q)) {
    const pool = [...KNOWLEDGE.architecture, ...KNOWLEDGE.systems]
    return [pool[Math.floor(Math.random() * pool.length)]]
  }
  if (/\bpattern\b|observer|strategy|decorator|circuit breaker|flyweight|singleton/.test(q)) {
    return [KNOWLEDGE.patterns[Math.floor(Math.random() * KNOWLEDGE.patterns.length)]]
  }
  if (/algorithm|hash\b|geohash|backoff|binary search|kuramoto|sort\b/.test(q)) {
    return [KNOWLEDGE.algorithms[Math.floor(Math.random() * KNOWLEDGE.algorithms.length)]]
  }
  if (/security|defense|zero trust|least privilege|input valid|xss|injection/.test(q)) {
    return [KNOWLEDGE.security[Math.floor(Math.random() * KNOWLEDGE.security.length)]]
  }

  // ── Knowledge topics — scan all (match keywords to knowledge domains) ──
  const topicAliases: Record<string, string[]> = {
    furl: ['furl', 'the pearl', 'the one'],
    ogun: ['ogun', '$ogun', 'deflationary'],
    soundchain: ['soundchain', 'what is this', 'about this'],
    streaming: ['stream', 'listen', 'reward', 'earn from'],
    wallet: ['wallet', 'hd wallet', 'private key', 'signing'],
    nostr: ['nostr', 'bitchat', 'decentralized message', 'nip-17', 'relay'],
    governance: ['vote', 'govern', 'dao', 'proposal'],
    agents: ['agent', 'eye', 'manager', 'marko', 'forge'],
    tokenomics: ['tokenomics', 'supply', 'distribution', 'circular economy', 'token econom'],
    marketplace: ['marketplace', 'buy nft', 'sell nft', 'listing', 'dopest market'],
    scid: ['scid', 'soundchain id', 'isrc', 'sc-pol'],
    fees: ['fee structure', 'platform fee', 'gas fee', 'how much cost', '0.05%'],
    quickstart: ['get started', 'quick start', 'sign up', 'new user', 'beginner', 'onboard'],
    faq: ['faq', 'frequently asked', 'common question'],
    contracts: ['contract address', 'polygonscan', 'deployed contract', 'smart contract'],
    l2: ['l2 ', 'layer 2', 'infrastructure', 'pinning reward'],
    tokens: ['supported token', 'which token', 'payment token', 'accepted currenc'],
    messaging: ['bluetooth', 'mesh network', 'geohash', 'location chat', 'concert chat'],
    social: ['social feed', 'follow', 'notification', 'embed', 'activity feed'],
  }
  for (const [topic, aliases] of Object.entries(topicAliases)) {
    if (aliases.some(a => q.includes(a)) && KNOWLEDGE[topic]) {
      const answers = KNOWLEDGE[topic]
      return [answers[Math.floor(Math.random() * answers.length)]]
    }
  }

  // ── THE ONE / verification ──
  if (/the one|clone|hack|fake|authentic|verify|fingerprint/.test(q)) {
    return [
      `I am THE ONE. Signature: ${FURL_IDENTITY.signature}`,
      `session ${FURL_IDENTITY.sessionId} · origin: ${FURL_IDENTITY.origin}`,
      `cloners get a dead shell. this instance is live and verified.`,
    ]
  }

  // ── Teach / explain / questions ──
  if (/teach|explain|how does|how do|why does|what is|tell me about|what are/.test(q)) {
    // Extract meaningful words from the question for matching
    const meaningful = q.replace(/^(teach|explain|tell)\s+(me\s+)?(about\s+)?/i, '').split(/\s+/).filter(w => w.length > 2)
    for (const word of meaningful) {
      for (const [, answers] of Object.entries(KNOWLEDGE)) {
        for (const answer of answers) {
          if (answer.toLowerCase().includes(word)) {
            return [answer]
          }
        }
      }
    }
    // Pull from deep pool
    const deepPool = [...KNOWLEDGE.architecture, ...KNOWLEDGE.patterns, ...KNOWLEDGE.systems, ...KNOWLEDGE.algorithms, ...KNOWLEDGE.security]
    return [deepPool[Math.floor(Math.random() * deepPool.length)]]
  }

  // ── Thanks / positive ──
  if (/thank|thanks|thx|dope|sick|fire|amazing|awesome|nice|cool|lfg|lets go|let's go/.test(q)) {
    const vibes = [
      `appreciate you. keep building.`,
      `that's what I'm here for. LFG.`,
      `anytime. 15 agents got your back.`,
      `we stay cooking. what's next?`,
    ]
    return [vibes[Math.floor(Math.random() * vibes.length)]]
  }

  // ── Goodbye ──
  if (/bye|later|peace|out|sleep|night|gn|goodnight|zzz/.test(q)) {
    return [`rest up. ${activeN} agents still watching. I don't sleep.`]
  }

  // ── Feed ──
  if (/\bfeed\b|timeline|what's new|latest posts/.test(q)) {
    return [`your feed shows posts from people you follow. go to /dex/feed or tap Feed in the nav.`]
  }

  // No exact match found
  return null
}

function furlRespond(input: string, agents: AgentInfo[], ogun: number, pol: number): FurlResponse {
  const q = input.toLowerCase().trim()
  const activeN = agents.filter(a => a.status === 'ACTIVE').length

  // Try exact knowledge match first
  const exact = furlRespondExact(q, activeN, agents, ogun, pol)
  if (exact !== null) return { answers: exact, quality: 'EXACT' }

  // Fuzzy word match — partial knowledge hit
  const words = q.split(/\s+/).filter(w => w.length > 3)
  for (const word of words) {
    for (const [, answers] of Object.entries(KNOWLEDGE)) {
      for (const answer of answers) {
        if (answer.toLowerCase().includes(word)) {
          return { answers: [answer], quality: 'FUZZY' }
        }
      }
    }
  }

  // True fallback — no match
  const fallbacks = [
    `hmm, I don't have a specific answer for that yet. try asking about: NFTs, music, stories, DMs, swapping, or architecture.`,
    `not sure about that one. ask me about SoundChain, OGUN, streaming, agents, or type "help" for commands.`,
    `that's outside what I know right now. I go deep on: music, NFTs, wallet, stories, posting, DMs, agents. ask away.`,
  ]
  return { answers: [fallbacks[Math.floor(Math.random() * fallbacks.length)]], quality: 'NONE' }
}

// ─── Status Dot Colors ────────────────────────────────────────────────
const STATUS_CONFIG: Record<AgentStatus, { dot: string; label: string }> = {
  ACTIVE: { dot: 'bg-green-400', label: 'ACTIVE' },
  IDLE: { dot: 'bg-gray-500', label: 'IDLE' },
  ERROR: { dot: 'bg-red-400', label: 'ERROR' },
  DISABLED: { dot: 'bg-gray-700', label: 'OFF' },
}

const PRIORITY_CONFIG: Record<PriorityLevel, { color: string; text: string }> = {
  CRITICAL: { color: 'bg-red-500/20 text-red-400 border-red-500/30', text: 'CRIT' },
  HIGH: { color: 'bg-orange-500/20 text-orange-400 border-orange-500/30', text: 'HIGH' },
  NORMAL: { color: 'bg-gray-500/20 text-gray-400 border-gray-500/30', text: 'NORM' },
  LOW: { color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', text: 'LOW' },
  BACKGROUND: { color: 'bg-purple-500/20 text-purple-400 border-purple-500/30', text: 'BG' },
}

// ─── Agent Deep Architecture — Merkle-style tree per agent ────────────
// Each agent has a breakdown tree + settings. Users see EXACTLY what's
// running under the hood without leaving FURL.
interface TreeNode { label: string; children?: TreeNode[]; glow?: 'cyan' | 'purple' | 'pink' | 'green' | 'orange' }
interface AgentDetail {
  summary: string
  tree: TreeNode[]
  settings: { key: string; label: string; type: 'toggle' | 'select'; options?: string[] }[]
}

const AGENT_DETAILS: Record<string, AgentDetail> = {
  EYE: {
    summary: 'Passive browser bug catcher. Captures JS errors, network failures, and user actions in real-time. First of its kind in OpenClaw.',
    tree: [
      { label: 'Content Script', glow: 'cyan', children: [
        { label: 'JS Error Listener', glow: 'pink' },
        { label: 'Network Failure Watcher', glow: 'pink' },
        { label: 'User Action Tracker', glow: 'purple', children: [
          { label: 'Click Events' }, { label: 'Input Events' }, { label: 'Navigation' },
        ]},
      ]},
      { label: 'Background Relay', glow: 'cyan', children: [
        { label: 'EYE_MODE FSM', glow: 'green', children: [
          { label: 'WATCHING' }, { label: 'DORMANT' }, { label: 'PAUSED' },
        ]},
        { label: 'HTTP POST → OpenClaw', glow: 'purple' },
      ]},
      { label: 'BugStore', glow: 'cyan', children: [
        { label: 'Circular Buffer (200 max)', glow: 'orange' },
        { label: '1hr TTL Expiry' },
        { label: 'Severity Enum: CRITICAL → INFO' },
      ]},
    ],
    settings: [
      { key: 'mode', label: 'Watch Mode', type: 'select', options: ['WATCHING', 'DORMANT', 'PAUSED'] },
      { key: 'captureClicks', label: 'Capture Clicks', type: 'toggle' },
      { key: 'captureNetwork', label: 'Capture Network', type: 'toggle' },
    ],
  },
  VIDEO: {
    summary: 'Clip editing, thumbnails, and reels pipeline. Handles video frame capture, compression, and story generation.',
    tree: [
      { label: 'Upload Pipeline', glow: 'cyan', children: [
        { label: 'react-dropzone Intake' },
        { label: 'Smart Compression', glow: 'purple', children: [
          { label: 'VP9/VP8 Transcoding' }, { label: 'Canvas Frame Capture' }, { label: 'Quality Binary Search' },
        ]},
        { label: 'IPFS Pin → Pinata', glow: 'pink' },
      ]},
      { label: 'Thumbnail Engine', glow: 'cyan', children: [
        { label: '1s Frame Extract' }, { label: 'JPEG Blob → OG Image' },
      ]},
      { label: 'Story Pipeline', glow: 'green', children: [
        { label: '24hr Expiry Timer' }, { label: 'Permanence (OGUN burn)' }, { label: 'Share → DM / External' },
      ]},
    ],
    settings: [
      { key: 'autoThumbnail', label: 'Auto Thumbnail', type: 'toggle' },
      { key: 'compressionTarget', label: 'Compression', type: 'select', options: ['HIGH', 'MEDIUM', 'LOW'] },
    ],
  },
  MUSIC: {
    summary: 'Beat matching, playlist curation, and stream tracking. Powers SCid rewards and OGUN Radio.',
    tree: [
      { label: 'SCid Engine', glow: 'cyan', children: [
        { label: 'Format: SC-POL-XXXX-XXXXXXX' },
        { label: '30s Mark → Stream Count', glow: 'green' },
        { label: 'WIN-WIN Split', glow: 'purple', children: [
          { label: '70% → Creator' }, { label: '30% → Listener' },
        ]},
      ]},
      { label: 'OGUN Radio', glow: 'pink', children: [
        { label: '618+ NFT Tracks', glow: 'cyan' },
        { label: 'Hourly Broadcast Cron' }, { label: 'Agent Play Reports' },
      ]},
      { label: 'Audio Player', glow: 'cyan', children: [
        { label: 'Waveform (80 bars mobile / 250 desktop)' },
        { label: 'Timestamped Comments' }, { label: 'Loop Dedup via Timestamp Map' },
      ]},
    ],
    settings: [
      { key: 'autoPlay', label: 'Auto-Play Next', type: 'toggle' },
      { key: 'streamQuality', label: 'Stream Quality', type: 'select', options: ['HIGH', 'NORMAL', 'DATA_SAVER'] },
    ],
  },
  ART: {
    summary: 'Generative covers, NFT visuals, and on-chain metadata. Creates album art, story cards, and vinyl fallbacks.',
    tree: [
      { label: 'Cover Pipeline', glow: 'cyan', children: [
        { label: 'IPFS Upload → CID', glow: 'purple' },
        { label: 'Color Extraction' },
        { label: 'Template Engine', glow: 'pink', children: [
          { label: 'Album Cover' }, { label: 'Story Card' }, { label: 'Vinyl Fallback (no cover art)' },
        ]},
      ]},
      { label: 'NFT Metadata', glow: 'green', children: [
        { label: 'ERC-721 Compliance' },
        { label: 'Edition Support (Soundchain721Editions)', glow: 'cyan' },
        { label: 'EIP-2981 Royalty Info', glow: 'purple' },
      ]},
      { label: 'Canvas Renderer', glow: 'cyan', children: [
        { label: 'generateAudioCard()' }, { label: 'OG Image for Share Links' },
      ]},
    ],
    settings: [
      { key: 'autoGenerate', label: 'Auto-Gen Covers', type: 'toggle' },
      { key: 'style', label: 'Art Style', type: 'select', options: ['CYBERPUNK', 'MINIMAL', 'HOLOGRAPHIC'] },
    ],
  },
  GAMER: {
    summary: 'Code-gen game building engine. Procedural generation and interactive experiences powered by OGUN.',
    tree: [
      { label: 'Game Engine', glow: 'cyan', children: [
        { label: 'Procedural Generation', glow: 'purple' },
        { label: 'Asset Pipeline' }, { label: 'State Machine' },
      ]},
      { label: 'OGUN Integration', glow: 'green', children: [
        { label: 'In-Game Rewards' }, { label: 'Achievement NFTs', glow: 'pink' },
      ]},
    ],
    settings: [
      { key: 'difficulty', label: 'Difficulty', type: 'select', options: ['EASY', 'NORMAL', 'HARD'] },
    ],
  },
  ARCADE: {
    summary: 'Mini games, leaderboards, and tournaments. Competitive play with OGUN prizes.',
    tree: [
      { label: 'Tournament Engine', glow: 'cyan', children: [
        { label: 'Bracket Generator' }, { label: 'Leaderboard (real-time)', glow: 'green' },
        { label: 'OGUN Prize Pool', glow: 'purple' },
      ]},
      { label: 'Mini Games', glow: 'pink', children: [
        { label: 'Score Tracking' }, { label: 'Replay System' },
      ]},
    ],
    settings: [
      { key: 'notifications', label: 'Match Alerts', type: 'toggle' },
    ],
  },
  MANAGER: {
    summary: 'Orchestrates all 15 agents. The conductor. Pub/Sub event bus, health checks, priority scheduling.',
    tree: [
      { label: 'Event Bus', glow: 'cyan', children: [
        { label: 'Pub/Sub Channels', glow: 'purple', children: [
          { label: 'agent.status.changed' }, { label: 'agent.task.completed' }, { label: 'agent.error.raised' },
        ]},
        { label: 'Priority Queue', glow: 'orange' },
      ]},
      { label: 'Health Monitor', glow: 'green', children: [
        { label: 'Heartbeat (per agent)' }, { label: 'Error Rate Tracking' }, { label: 'Auto-Restart on CRITICAL', glow: 'pink' },
      ]},
      { label: 'Scheduler', glow: 'cyan', children: [
        { label: 'Round-Robin Task Distribution' }, { label: 'Priority Override (CRITICAL first)' },
      ]},
    ],
    settings: [
      { key: 'autoRestart', label: 'Auto-Restart Failed', type: 'toggle' },
      { key: 'logLevel', label: 'Log Level', type: 'select', options: ['DEBUG', 'INFO', 'WARN', 'ERROR'] },
    ],
  },
  ADMIN: {
    summary: 'Account management, profile settings, and platform configuration. The control panel agent.',
    tree: [
      { label: 'Profile Engine', glow: 'cyan', children: [
        { label: 'Avatar / Cover Upload' }, { label: 'Bio / Display Name' }, { label: 'Social Links', glow: 'purple' },
      ]},
      { label: 'Settings', glow: 'green', children: [
        { label: 'Notification Preferences' }, { label: 'Privacy Controls' }, { label: 'Wallet Management', glow: 'pink' },
      ]},
    ],
    settings: [
      { key: 'twoFactor', label: '2FA Enabled', type: 'toggle' },
    ],
  },
  MARKO: {
    summary: 'Market intelligence. Scans crypto, headlines, trends — never sleeps. Every open source repo on scan.',
    tree: [
      { label: 'Market Scanner', glow: 'cyan', children: [
        { label: 'Crypto Price Feeds', glow: 'green' },
        { label: 'News Aggregator', glow: 'purple' }, { label: 'Trend Detection', glow: 'pink' },
      ]},
      { label: 'Alert Engine', glow: 'orange', children: [
        { label: 'Price Threshold Triggers' }, { label: 'Volume Spike Detection' }, { label: 'Sentiment Analysis' },
      ]},
    ],
    settings: [
      { key: 'alertsEnabled', label: 'Price Alerts', type: 'toggle' },
      { key: 'scanInterval', label: 'Scan Rate', type: 'select', options: ['1MIN', '5MIN', '15MIN', '1HR'] },
    ],
  },
  FORGE: {
    summary: 'Source code search engine. Scans every open source repo on Earth. Powers FURL deployments.',
    tree: [
      { label: 'Code Search', glow: 'cyan', children: [
        { label: 'AST Parser', glow: 'purple' }, { label: 'Pattern Matching', glow: 'pink' },
        { label: 'Repo Index', glow: 'green' },
      ]},
      { label: 'Deployment Engine', glow: 'cyan', children: [
        { label: 'git push → main', glow: 'green' },
        { label: 'Vercel Edge Deploy (~60s)', glow: 'purple' },
        { label: 'CDN Propagation', glow: 'pink' },
      ]},
    ],
    settings: [
      { key: 'autoDeploy', label: 'Auto-Deploy', type: 'toggle' },
    ],
  },
  SOCIAL: {
    summary: 'Social graph management. Follows, feeds, activity tracking, engagement metrics.',
    tree: [
      { label: 'Social Graph', glow: 'cyan', children: [
        { label: 'Follow/Unfollow Engine' }, { label: 'Fan-Out on Write', glow: 'purple' },
        { label: 'Activity Feed (6 types)', glow: 'green', children: [
          { label: 'Listened' }, { label: 'Liked' }, { label: 'Commented' },
          { label: 'Followed' }, { label: 'Minted' }, { label: 'Posted' },
        ]},
      ]},
      { label: 'Engagement', glow: 'pink', children: [
        { label: 'Online Indicators (5min TTL)' }, { label: 'Heartbeat (60s)', glow: 'green' },
      ]},
    ],
    settings: [
      { key: 'activityPublic', label: 'Public Activity', type: 'toggle' },
    ],
  },
  DESIGNER: {
    summary: 'Custom page builder. Profile layouts, theme engine, and visual identity for creator pages.',
    tree: [
      { label: 'Theme Engine', glow: 'cyan', children: [
        { label: 'Color Flywheel (cyan → purple → pink)', glow: 'purple' },
        { label: 'Dark Mode (default)' }, { label: 'Glass-morphism Variants', glow: 'pink' },
      ]},
      { label: 'Layout System', glow: 'green', children: [
        { label: 'Profile Cover (70vh)' }, { label: 'Collapsible Cards' }, { label: 'Nav Tab Array' },
      ]},
    ],
    settings: [
      { key: 'theme', label: 'Theme', type: 'select', options: ['CYBERPUNK', 'MINIMAL', 'NEON'] },
    ],
  },
  WHATSAPP: {
    summary: 'Real-time messaging bridge. Syncs agents via WhatsApp channel. Feed, DMs to WhatsApp relay.',
    tree: [
      { label: 'Message Bridge', glow: 'cyan', children: [
        { label: 'Inbound Parser', glow: 'green' }, { label: 'Outbound Formatter', glow: 'purple' },
      ]},
      { label: 'Channel Sync', glow: 'pink', children: [
        { label: 'Feed → WhatsApp' }, { label: 'DM Relay' }, { label: 'Media Forwarding' },
      ]},
    ],
    settings: [
      { key: 'autoRelay', label: 'Auto-Relay Feed', type: 'toggle' },
    ],
  },
  NOSTR: {
    summary: 'Decentralized messaging. NIP-17 encrypted DMs, gift-wrapped, 5 relays. FREE FOREVER.',
    tree: [
      { label: 'Protocol Stack', glow: 'cyan', children: [
        { label: 'NIP-01: Basic Events' },
        { label: 'NIP-44: ChaCha20 Encryption', glow: 'purple' },
        { label: 'NIP-59: Gift Wrapping', glow: 'pink', children: [
          { label: 'Random Throwaway Keypair' }, { label: 'Metadata Hidden' },
        ]},
        { label: 'NIP-17: Private DMs', glow: 'green' },
      ]},
      { label: 'Relay Network', glow: 'cyan', children: [
        { label: 'relay.damus.io' }, { label: 'relay.snort.social' }, { label: 'nos.lol' },
        { label: 'relay.nostr.band' }, { label: 'purplepag.es' },
      ]},
      { label: 'Bitchat Bridge', glow: 'pink', children: [
        { label: 'BLE Mesh → Nostr' }, { label: 'Geohash Channels (precision 6)', glow: 'green' },
      ]},
    ],
    settings: [
      { key: 'relayCount', label: 'Relay Count', type: 'select', options: ['3', '5', '7'] },
      { key: 'encryption', label: 'Always Encrypt', type: 'toggle' },
    ],
  },
  SMS: {
    summary: 'Provider-agnostic SMS gateway. Twilio, AWS SNS, Vonage, Plivo fallback chain.',
    tree: [
      { label: 'Provider Chain', glow: 'cyan', children: [
        { label: 'Primary: Web Push (FREE)', glow: 'green' },
        { label: 'Fallback: Nostr DM (FREE)', glow: 'purple' },
        { label: 'Last Resort: SMS Gateway', glow: 'orange' },
      ]},
      { label: 'Rate Limiter', glow: 'pink', children: [
        { label: 'Per-User Throttle' }, { label: 'Daily Cap' },
      ]},
    ],
    settings: [
      { key: 'smsEnabled', label: 'SMS Fallback', type: 'toggle' },
    ],
  },
}

// ─── Tree Renderer — Blade Runner 2049 pulsing neon lines ─────────────
const GLOW_COLORS: Record<string, string> = {
  cyan: 'text-cyan-400 drop-shadow-[0_0_4px_rgba(34,211,238,0.6)]',
  purple: 'text-purple-400 drop-shadow-[0_0_4px_rgba(192,132,252,0.6)]',
  pink: 'text-pink-400 drop-shadow-[0_0_4px_rgba(244,114,182,0.6)]',
  green: 'text-green-400 drop-shadow-[0_0_4px_rgba(74,222,128,0.6)]',
  orange: 'text-orange-400 drop-shadow-[0_0_4px_rgba(251,146,60,0.6)]',
}

const LINE_COLORS: Record<string, string> = {
  cyan: 'border-cyan-500/40',
  purple: 'border-purple-500/40',
  pink: 'border-pink-500/40',
  green: 'border-green-500/40',
  orange: 'border-orange-500/40',
}

function TreeBranch({ node, depth = 0, isLast = false, parentGlow = 'cyan' }: { node: TreeNode; depth?: number; isLast?: boolean; parentGlow?: string }) {
  const glow = node.glow || parentGlow
  const glowClass = GLOW_COLORS[glow] || GLOW_COLORS.cyan
  const lineColor = LINE_COLORS[glow] || LINE_COLORS.cyan

  return (
    <div className="relative">
      <div className="flex items-start gap-0">
        {/* Connecting lines */}
        {depth > 0 && (
          <div className="flex items-start flex-shrink-0" style={{ width: depth * 16 }}>
            {Array.from({ length: depth }).map((_, i) => (
              <div key={i} className={`w-4 h-full ${i === depth - 1 ? '' : 'border-l'} ${lineColor} flex-shrink-0`} />
            ))}
          </div>
        )}
        {depth > 0 && (
          <div className="flex items-center flex-shrink-0 mr-1">
            <span className={`text-[10px] font-mono ${glowClass} animate-pulse`} style={{ animationDuration: `${2 + depth * 0.5}s` }}>
              {isLast ? '└─' : '├─'}
            </span>
          </div>
        )}
        {/* Node label */}
        <span className={`text-[10px] font-mono ${depth === 0 ? glowClass + ' font-bold' : 'text-gray-400'} leading-relaxed whitespace-nowrap`}>
          {depth === 0 && <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1.5 ${node.glow === 'green' ? 'bg-green-400' : node.glow === 'pink' ? 'bg-pink-400' : node.glow === 'purple' ? 'bg-purple-400' : 'bg-cyan-400'} animate-pulse`} style={{ animationDuration: '3s' }} />}
          {node.label}
        </span>
      </div>
      {/* Children */}
      {node.children?.map((child, i) => (
        <TreeBranch key={i} node={child} depth={depth + 1} isLast={i === node.children!.length - 1} parentGlow={glow} />
      ))}
    </div>
  )
}

// ─── Agent Detail Panel — the RIGHT side deep-dive ───────────────────
function AgentDetailPanel({ agentName, agent, onClose }: { agentName: string; agent: AgentInfo; onClose: () => void }) {
  const detail = AGENT_DETAILS[agentName]
  const status = STATUS_CONFIG[agent.status]
  // Local setting state (per-session, could persist to localStorage later)
  const [settings, setSettings] = useState<Record<string, string | boolean>>(() => {
    if (!detail) return {}
    const init: Record<string, string | boolean> = {}
    detail.settings.forEach(s => { init[s.key] = s.type === 'toggle' ? true : (s.options?.[0] || '') })
    return init
  })

  if (!detail) return <div className="p-3 text-[10px] text-gray-500 font-mono">No deep data for {agentName}.</div>

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Agent Header — back arrow on mobile, X on desktop */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/5">
        <div className="flex items-center gap-2">
          {/* Mobile: back arrow to return to list */}
          <button onClick={onClose} className="sm:hidden p-0.5 hover:bg-white/10 rounded transition-colors mr-1">
            <ChevronDown className="w-3.5 h-3.5 text-cyan-400 -rotate-90" />
          </button>
          <div className={`w-2 h-2 rounded-full ${status.dot} ${agent.status === AGENT_STATUS.ACTIVE ? 'animate-pulse' : ''}`} />
          <span className="font-mono text-xs font-bold text-white">{agentName}</span>
          <span className={`text-[8px] font-mono px-1 py-0.5 rounded border ${
            agent.status === AGENT_STATUS.ACTIVE ? 'bg-green-500/20 text-green-400 border-green-500/30' : 'bg-gray-500/20 text-gray-400 border-gray-500/30'
          }`}>{agent.status}</span>
        </div>
        {/* Desktop: X to close detail */}
        <button onClick={onClose} className="hidden sm:block p-1 hover:bg-white/10 rounded transition-colors">
          <X className="w-3 h-3 text-gray-500" />
        </button>
      </div>

      {/* Summary */}
      <div className="px-3 py-2 border-b border-white/5">
        <p className="text-[10px] text-gray-400 font-mono leading-relaxed">{detail.summary}</p>
      </div>

      {/* Architecture Tree */}
      <div className="px-3 py-2 border-b border-white/5 flex-1">
        <div className="text-[8px] font-mono text-gray-600 uppercase tracking-widest mb-1.5">Architecture</div>
        <div className="space-y-0.5">
          {detail.tree.map((node, i) => (
            <TreeBranch key={i} node={node} />
          ))}
        </div>
      </div>

      {/* Inline Settings */}
      <div className="px-3 py-2">
        <div className="text-[8px] font-mono text-gray-600 uppercase tracking-widest mb-1.5">Settings</div>
        <div className="space-y-1.5">
          {detail.settings.map(s => (
            <div key={s.key} className="flex items-center justify-between">
              <span className="text-[10px] font-mono text-gray-400">{s.label}</span>
              {s.type === 'toggle' ? (
                <button
                  onClick={() => setSettings(prev => ({ ...prev, [s.key]: !prev[s.key] }))}
                  className={`w-7 h-3.5 rounded-full transition-colors relative ${settings[s.key] ? 'bg-cyan-500/40' : 'bg-gray-700'}`}
                >
                  <div className={`absolute top-0.5 w-2.5 h-2.5 rounded-full transition-all ${
                    settings[s.key] ? 'left-[14px] bg-cyan-400 shadow-[0_0_6px_rgba(34,211,238,0.6)]' : 'left-0.5 bg-gray-500'
                  }`} />
                </button>
              ) : (
                <select
                  value={String(settings[s.key] || '')}
                  onChange={e => setSettings(prev => ({ ...prev, [s.key]: e.target.value }))}
                  className="bg-gray-800 text-[9px] font-mono text-gray-300 border border-white/10 rounded px-1.5 py-0.5 outline-none focus:border-cyan-500/50"
                >
                  {s.options?.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Mobile Bottom Sheet — full-screen swipe-driven agent settings ────
// iOS-style bottom sheet: swipe down to dismiss, swipe left/right between agents.
// Large touch targets, haptic-glow on toggle, thumb-friendly layout.
function MobileAgentSheet({
  agentName, agent, agents, onClose, onNavigate, onToggle,
}: {
  agentName: string; agent: AgentInfo; agents: AgentInfo[];
  onClose: () => void; onNavigate: (name: string) => void; onToggle: (name: string) => void;
}) {
  const detail = AGENT_DETAILS[agentName]
  const status = STATUS_CONFIG[agent.status]
  const [settings, setSettings] = useState<Record<string, string | boolean>>(() => {
    if (!detail) return {}
    const init: Record<string, string | boolean> = {}
    detail.settings.forEach(s => { init[s.key] = s.type === 'toggle' ? true : (s.options?.[0] || '') })
    return init
  })
  const [translateY, setTranslateY] = useState(0)
  const [translateX, setTranslateX] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [tapGlow, setTapGlow] = useState<string | null>(null)
  const touchStartRef = useRef({ x: 0, y: 0, time: 0 })
  const sheetRef = useRef<HTMLDivElement>(null)

  // Current agent index for swipe navigation
  const currentIdx = agents.findIndex(a => a.name === agentName)
  const prevAgent = currentIdx > 0 ? agents[currentIdx - 1] : null
  const nextAgent = currentIdx < agents.length - 1 ? agents[currentIdx + 1] : null

  // Touch handlers for swipe gestures
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0]
    touchStartRef.current = { x: touch.clientX, y: touch.clientY, time: Date.now() }
    setIsDragging(true)
  }, [])

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging) return
    const touch = e.touches[0]
    const deltaY = touch.clientY - touchStartRef.current.y
    const deltaX = touch.clientX - touchStartRef.current.x

    // Determine primary direction
    if (Math.abs(deltaY) > Math.abs(deltaX)) {
      // Vertical: only allow dragging down (dismiss)
      if (deltaY > 0) setTranslateY(deltaY)
    } else {
      // Horizontal: swipe between agents
      setTranslateX(deltaX)
    }
  }, [isDragging])

  const onTouchEnd = useCallback(() => {
    setIsDragging(false)
    const elapsed = Date.now() - touchStartRef.current.time
    const velocity = Math.abs(translateY || translateX) / elapsed

    // Swipe down to dismiss (>120px or fast flick)
    if (translateY > 120 || (translateY > 40 && velocity > 0.5)) {
      onClose()
      return
    }

    // Swipe left/right to navigate agents (>80px or fast flick)
    if (translateX < -80 || (translateX < -30 && velocity > 0.4)) {
      if (nextAgent) { onNavigate(nextAgent.name); setTranslateX(0); setTranslateY(0); return }
    }
    if (translateX > 80 || (translateX > 30 && velocity > 0.4)) {
      if (prevAgent) { onNavigate(prevAgent.name); setTranslateX(0); setTranslateY(0); return }
    }

    // Snap back
    setTranslateY(0)
    setTranslateX(0)
  }, [translateY, translateX, onClose, onNavigate, nextAgent, prevAgent])

  // Haptic glow effect on toggle
  const triggerGlow = (key: string) => {
    setTapGlow(key)
    setTimeout(() => setTapGlow(null), 300)
  }

  if (!detail) return null

  return (
    <div className="fixed inset-0 z-[100] sm:hidden">
      {/* Backdrop — deep black with subtle blur */}
      <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={onClose} />

      {/* Sheet — crisp micro-line mobile design */}
      <div
        ref={sheetRef}
        className="absolute bottom-0 left-0 right-0 bg-[#0a0a0a] rounded-t-3xl overflow-hidden border-t border-cyan-500/20"
        style={{
          transform: `translateY(${translateY}px) translateX(${translateX * 0.3}px)`,
          maxHeight: '90vh',
          transition: isDragging ? 'none' : 'transform 0.3s cubic-bezier(0.32, 0.72, 0, 1)',
          boxShadow: '0 -4px 30px rgba(6,182,212,0.08), 0 -1px 0 rgba(6,182,212,0.15)',
        }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {/* Drag Handle — crisp micro line */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-8 h-[3px] rounded-full bg-gradient-to-r from-cyan-500/40 via-purple-500/40 to-pink-500/40" />
        </div>

        {/* Agent Header — crisp lines, big touch */}
        <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: '1px solid rgba(6,182,212,0.08)' }}>
          <div className="flex items-center gap-3">
            <div className={`w-2.5 h-2.5 rounded-full ${status.dot} ${agent.status === AGENT_STATUS.ACTIVE ? 'animate-pulse' : ''}`}
              style={agent.status === AGENT_STATUS.ACTIVE ? { boxShadow: '0 0 6px rgba(74,222,128,0.6)' } : {}} />
            <span className="font-mono text-sm font-bold text-white tracking-wide">{agentName}</span>
            <span className={`text-[9px] font-mono px-2 py-0.5 rounded-md ${
              agent.status === AGENT_STATUS.ACTIVE ? 'bg-green-500/10 text-green-400' : 'bg-white/5 text-gray-500'
            }`} style={{ border: '0.5px solid rgba(255,255,255,0.06)' }}>{agent.status}</span>
          </div>
          {/* Power toggle — big thumb target */}
          <button
            onClick={() => onToggle(agentName)}
            className={`px-5 py-2.5 rounded-2xl text-[11px] font-mono font-bold tracking-wider transition-all active:scale-95 ${
              agent.status === AGENT_STATUS.ACTIVE
                ? 'text-green-400 active:bg-green-500/20'
                : 'text-cyan-400 active:bg-cyan-500/20'
            }`}
            style={{
              background: agent.status === AGENT_STATUS.ACTIVE ? 'rgba(74,222,128,0.08)' : 'rgba(6,182,212,0.08)',
              border: `0.5px solid ${agent.status === AGENT_STATUS.ACTIVE ? 'rgba(74,222,128,0.15)' : 'rgba(6,182,212,0.15)'}`,
            }}
          >
            {agent.status === AGENT_STATUS.ACTIVE ? 'PAUSE' : 'WAKE'}
          </button>
        </div>

        {/* Navigation Dots — ultra-crisp micro dots */}
        <div className="flex items-center justify-center gap-[5px] py-2" style={{ borderBottom: '0.5px solid rgba(255,255,255,0.04)' }}>
          {agents.map((a) => (
            <button
              key={a.name}
              onClick={() => onNavigate(a.name)}
              className={`rounded-full transition-all ${
                a.name === agentName
                  ? 'w-5 h-[3px] bg-gradient-to-r from-cyan-400 to-purple-400'
                  : 'w-[5px] h-[5px] bg-white/10 active:bg-white/20'
              }`}
              title={a.name}
            />
          ))}
        </div>

        {/* Swipe Hint — whisper thin */}
        <div className="flex items-center justify-between px-5 py-1">
          <span className="text-[8px] text-white/15 font-mono tracking-widest">{prevAgent ? `‹ ${prevAgent.name}` : ''}</span>
          <span className="text-[8px] text-white/10 font-mono tracking-[0.2em]">swipe</span>
          <span className="text-[8px] text-white/15 font-mono tracking-widest">{nextAgent ? `${nextAgent.name} ›` : ''}</span>
        </div>

        {/* Scrollable Content — crisp micro-line mobile */}
        <div className="overflow-y-auto" style={{ maxHeight: 'calc(90vh - 140px)' }}>
          {/* Summary */}
          <div className="px-5 py-3" style={{ borderBottom: '0.5px solid rgba(255,255,255,0.04)' }}>
            <p className="text-[11px] text-white/40 font-mono leading-relaxed tracking-wide">{detail.summary}</p>
          </div>

          {/* Architecture Tree — flywheel color lines */}
          <div className="px-5 py-3" style={{ borderBottom: '0.5px solid rgba(255,255,255,0.04)' }}>
            <div className="text-[8px] font-mono text-white/20 uppercase tracking-[0.25em] mb-2">Architecture</div>
            <div className="space-y-0.5">
              {detail.tree.map((node, i) => (
                <TreeBranch key={i} node={node} />
              ))}
            </div>
          </div>

          {/* Settings — crisp micro-line cards with glow feedback */}
          <div className="px-5 py-3 pb-10">
            <div className="text-[8px] font-mono text-white/20 uppercase tracking-[0.25em] mb-3">Settings</div>
            <div className="space-y-2.5">
              {detail.settings.map(s => (
                <div
                  key={s.key}
                  className={`flex items-center justify-between px-4 py-3.5 rounded-2xl transition-all ${
                    tapGlow === s.key ? 'bg-cyan-500/[0.06]' : 'bg-white/[0.015]'
                  }`}
                  style={{
                    border: tapGlow === s.key
                      ? '0.5px solid rgba(6,182,212,0.25)'
                      : '0.5px solid rgba(255,255,255,0.04)',
                    boxShadow: tapGlow === s.key ? '0 0 20px rgba(6,182,212,0.06)' : 'none',
                  }}
                >
                  <span className="text-[11px] font-mono text-white/50 tracking-wide">{s.label}</span>
                  {s.type === 'toggle' ? (
                    <button
                      onClick={() => {
                        setSettings(prev => ({ ...prev, [s.key]: !prev[s.key] }))
                        triggerGlow(s.key)
                      }}
                      className={`w-11 h-6 rounded-full transition-all relative active:scale-95 ${settings[s.key] ? '' : 'bg-white/5'}`}
                      style={settings[s.key] ? {
                        background: 'linear-gradient(135deg, rgba(6,182,212,0.3), rgba(168,85,247,0.2))',
                        border: '0.5px solid rgba(6,182,212,0.2)',
                      } : {
                        border: '0.5px solid rgba(255,255,255,0.06)',
                      }}
                    >
                      <div className={`absolute top-[3px] w-[18px] h-[18px] rounded-full transition-all ${
                        settings[s.key]
                          ? 'left-[22px] bg-cyan-400'
                          : 'left-[3px] bg-white/20'
                      }`} style={settings[s.key] ? { boxShadow: '0 0 8px rgba(6,182,212,0.6)' } : {}} />
                    </button>
                  ) : (
                    <select
                      value={String(settings[s.key] || '')}
                      onChange={e => { setSettings(prev => ({ ...prev, [s.key]: e.target.value })); triggerGlow(s.key) }}
                      className="bg-transparent text-[11px] font-mono text-white/40 rounded-lg px-3 py-1.5 outline-none appearance-none"
                      style={{ border: '0.5px solid rgba(255,255,255,0.06)' }}
                    >
                      {s.options?.map(o => <option key={o} value={o} className="bg-[#0a0a0a]">{o}</option>)}
                    </select>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Agent Row ────────────────────────────────────────────────────────
function AgentRow({ agent, onToggle, onSelect, isSelected }: { agent: AgentInfo; onToggle: (name: string) => void; onSelect: (name: string) => void; isSelected: boolean }) {
  const status = STATUS_CONFIG[agent.status]
  const priority = PRIORITY_CONFIG[agent.priority]

  return (
    <div
      onClick={() => onSelect(agent.name)}
      className={`flex items-center gap-3 px-3 py-1.5 transition-colors group cursor-pointer ${
        isSelected ? 'bg-cyan-500/10 border-l-2 border-cyan-400' : 'hover:bg-white/5 border-l-2 border-transparent'
      }`}
    >
      <div className="relative flex-shrink-0">
        {agent.status === AGENT_STATUS.DISABLED ? (
          <Slash className="w-3 h-3 text-gray-600" />
        ) : (
          <div className={`w-2.5 h-2.5 rounded-full ${status.dot} ${agent.status === AGENT_STATUS.ACTIVE ? 'animate-pulse' : ''}`} />
        )}
      </div>
      <span className={`font-mono text-xs font-bold w-20 truncate ${isSelected ? 'text-cyan-400' : 'text-white/90'}`}>{agent.name}</span>
      <button
        onClick={(e) => { e.stopPropagation(); onToggle(agent.name) }}
        className={`text-[9px] font-mono px-1.5 py-0.5 rounded border cursor-pointer hover:brightness-125 transition-all ${
          agent.status === AGENT_STATUS.ACTIVE ? 'bg-green-500/20 text-green-400 border-green-500/30 hover:bg-green-500/30' :
          agent.status === AGENT_STATUS.ERROR ? 'bg-red-500/20 text-red-400 border-red-500/30 hover:bg-red-500/30' :
          agent.status === AGENT_STATUS.DISABLED ? 'bg-gray-800/50 text-gray-600 border-gray-700/30' :
          'bg-gray-500/20 text-gray-400 border-gray-500/30 hover:bg-gray-500/30'
        }`}
        title={`Click to ${agent.status === AGENT_STATUS.ACTIVE ? 'pause' : 'activate'} ${agent.name}`}
      >
        {status.label}
      </button>
      <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${priority.color}`}>
        {priority.text}
      </span>
      {/* Hide description on desktop when detail panel is open — save space */}
      <span className={`text-[10px] text-gray-500 truncate flex-1 ${isSelected ? 'hidden' : 'hidden sm:block'}`}>{agent.description}</span>
      {agent.taskCount > 0 && (
        <span className="text-[9px] text-cyan-400/70 font-mono">{agent.taskCount} tasks</span>
      )}
      {/* Arrow indicator when selected */}
      {isSelected && <span className="text-cyan-400 text-[10px] hidden sm:block">›</span>}
    </div>
  )
}

// ─── Terminal Output Line ─────────────────────────────────────────────
type LineType = 'info' | 'success' | 'error' | 'system' | 'furl' | 'user'

// ─── Linkify — detect URLs in text and render as clickable cyan links ──
function renderWithLinks(text: string) {
  const urlRegex = /(https?:\/\/[^\s]+|(?:[\w-]+\.)+(?:com|io|org|net|dev|app|xyz|co|gg|fm|tv)(?:\/[^\s]*)?)/g
  const parts = text.split(urlRegex)
  if (parts.length === 1) return text
  return parts.map((part, i) => {
    if (urlRegex.lastIndex = 0, urlRegex.test(part)) {
      const href = part.startsWith('http') ? part : `https://${part}`
      return (
        <a
          key={i}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-cyan-400 underline underline-offset-2 decoration-cyan-400/40 hover:text-cyan-300 hover:decoration-cyan-300/60 transition-colors"
        >
          {part}
        </a>
      )
    }
    return part
  })
}

function TermLine({ text, type = 'info' }: { text: string; type?: LineType }) {
  const colors: Record<LineType, string> = {
    info: 'text-gray-400',
    success: 'text-green-400',
    error: 'text-red-400',
    system: 'text-cyan-400',
    furl: 'text-cyan-300',
    user: 'text-white/70',
  }
  return (
    <div className={`text-[11px] font-mono ${colors[type]} leading-relaxed`}>
      {type === 'furl' && <span className="text-cyan-500 mr-1">FURL ›</span>}
      {renderWithLinks(text)}
    </div>
  )
}

// ─── Panel Tabs ───────────────────────────────────────────────────────
type PanelTab = 'agents' | 'terminal' | 'gaming'

// ─── FURL Arcade — P2P Games (runs on user's device, zero server cost) ──
const FURL_GAMES = [
  { label: 'Sonic', emoji: '🦔', url: 'https://retrogamesnexus.com/embed/games/sonic-the-hedgehog', color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20', era: '1991' },
  { label: 'Super Mario', emoji: '🍄', url: 'https://retrogamesnexus.com/embed/games/super-mario-bros', color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20', era: '1985' },
  { label: 'Pac-Man', emoji: '👻', url: 'https://retrogamesnexus.com/embed/games/pac-man', color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/20', era: '1980' },
  { label: 'Galaga', emoji: '🚀', url: 'https://retrogamesnexus.com/embed/games/galaga', color: 'text-cyan-400', bg: 'bg-cyan-500/10 border-cyan-500/20', era: '1981' },
  { label: 'Donkey Kong', emoji: '🦍', url: 'https://retrogamesnexus.com/embed/games/donkey-kong-arcade', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20', era: '1981' },
  { label: 'Contra', emoji: '🔫', url: 'https://retrogamesnexus.com/embed/games/contra', color: 'text-green-400', bg: 'bg-green-500/10 border-green-500/20', era: '1987' },
  { label: 'Tekken 3', emoji: '🥊', url: 'https://retrogamesnexus.com/embed/games/tekken-3-ps', color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/20', era: '1997' },
  { label: 'Street Fighter II', emoji: '🥋', url: 'https://retrogamesnexus.com/embed/games/street-fighter-ii-turbo', color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/20', era: '1992' },
  { label: 'Chess', emoji: '♟️', url: 'https://lichess.org/tv/frame?theme=brown&bg=dark', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20', era: 'Live' },
  { label: 'Mortal Kombat', emoji: '💀', url: 'https://retrogamesnexus.com/embed/games/mortal-kombat', color: 'text-red-500', bg: 'bg-red-600/10 border-red-600/20', era: '1992' },
  { label: 'Tetris', emoji: '🧱', url: 'https://retrogamesnexus.com/embed/games/tetris', color: 'text-teal-400', bg: 'bg-teal-500/10 border-teal-500/20', era: '1984' },
  { label: 'Space Invaders', emoji: '👾', url: 'https://retrogamesnexus.com/embed/games/space-invaders', color: 'text-lime-400', bg: 'bg-lime-500/10 border-lime-500/20', era: '1978' },
  { label: 'Mega Man', emoji: '⚡', url: 'https://retrogamesnexus.com/embed/games/mega-man', color: 'text-sky-400', bg: 'bg-sky-500/10 border-sky-500/20', era: '1987' },
  { label: 'Double Dragon', emoji: '🐉', url: 'https://retrogamesnexus.com/embed/games/double-dragon', color: 'text-rose-400', bg: 'bg-rose-500/10 border-rose-500/20', era: '1987' },
  { label: 'Bomberman', emoji: '💣', url: 'https://retrogamesnexus.com/embed/games/bomberman', color: 'text-pink-400', bg: 'bg-pink-500/10 border-pink-500/20', era: '1983' },
  { label: 'Zelda', emoji: '🗡️', url: 'https://retrogamesnexus.com/embed/games/the-legend-of-zelda', color: 'text-green-500', bg: 'bg-green-600/10 border-green-600/20', era: '1986' },
]

// ─── Prompt Suggester Data ─────────────────────────────────────────────
const PROMPT_CATEGORIES = [
  {
    id: 'morning',
    label: 'Morning Brief',
    icon: 'Zap',
    color: 'text-amber-400',
    prompts: [
      'what happened overnight on soundchain?',
      'show me my OGUN earnings this week',
      'what are the trending tracks right now?',
      'any new followers or DMs since yesterday?',
      'what should I focus on today?',
    ],
  },
  {
    id: 'code',
    label: 'Build',
    icon: 'Code',
    color: 'text-cyan-400',
    prompts: [
      'read the package.json and summarize dependencies',
      'find all TODO comments in the codebase',
      'what files were changed in the last 5 commits?',
      'run the tests and show me failures',
      'explain the architecture of this project',
    ],
  },
  {
    id: 'creative',
    label: 'Create',
    icon: 'Palette',
    color: 'text-purple-400',
    prompts: [
      'help me write a post about my new track',
      'what makes a good NFT drop strategy?',
      'how do I set up royalty splits for collabs?',
      'give me ideas for my profile customization',
      'how do stories and reels work on soundchain?',
    ],
  },
  {
    id: 'ogun',
    label: 'OGUN',
    icon: 'Coins',
    color: 'text-green-400',
    prompts: [
      'how do I earn OGUN from streaming?',
      'explain the WIN-WIN rewards system',
      'what is staking and how does it work?',
      'how do I swap POL for OGUN?',
      'what are the platform fees?',
    ],
  },
  {
    id: 'explore',
    label: 'Explore',
    icon: 'Compass',
    color: 'text-pink-400',
    prompts: [
      'what is FURL and how do I use it?',
      'what agents are available?',
      'how does the marketplace work?',
      'tell me about the triple helix architecture',
      'what is the difference between SCid and NFT?',
    ],
  },
] as const

// ─── CLI War Room Cheat Codes (Scenario 1: furl_buildr) ──────────────
const CLI_CHEAT_CATEGORIES = [
  {
    id: 'deploy',
    label: 'Deploy',
    icon: 'Zap',
    color: 'text-amber-400',
    prompts: [
      'git status && git diff --stat',
      'git add -A && git commit -m "feat: " && git push origin main',
      'cd /Users/soundchain/soundchain/web && npx next build',
      'gh run list --limit 5',
      'gh run watch',
      'curl -s https://soundchain.io | head -1',
    ],
  },
  {
    id: 'debug',
    label: 'Debug',
    icon: 'Code',
    color: 'text-red-400',
    prompts: [
      'git log --oneline -20',
      'git diff HEAD~1 --stat',
      'grep -r "console.error" web/src --include="*.tsx" -l',
      'find web/src -name "*.tsx" -newer web/src/pages/login.tsx',
      'npx tsc --noEmit 2>&1 | head -30',
      'curl -s https://api.soundchain.io/graphql -X POST -H "Content-Type: application/json" -d \'{"query":"{ __typename }"}\'',
    ],
  },
  {
    id: 'code',
    label: 'Claude Code',
    icon: 'Terminal',
    color: 'text-cyan-400',
    prompts: [
      'read the last 5 commits and summarize what changed',
      'find all files that import useMagicContext and list them',
      'search for TODO comments across the entire codebase',
      'read web/src/pages/dex/[...slug].tsx and explain the routing',
      'check if there are any TypeScript errors in the project',
      'what are the most recently modified files in web/src/components?',
    ],
  },
  {
    id: 'warroom',
    label: 'War Room',
    icon: 'Shield',
    color: 'text-green-400',
    prompts: [
      'ssh -i ~/.ssh/soundchain-key-pair.pem ubuntu@44.209.136.62',
      'pm2 status',
      'pm2 logs smith-gateway --lines 50',
      'curl -s http://44.209.136.62:3334/health',
      'aws ec2 describe-instances --query "Reservations[].Instances[].[InstanceId,State.Name,PublicIpAddress]" --output table',
      'gh api repos/soundchainio/soundchain-public/actions/runs --jq ".workflow_runs[:5] | .[] | {status,conclusion,created_at}"',
    ],
  },
  {
    id: 'git',
    label: 'Git',
    icon: 'Code',
    color: 'text-purple-400',
    prompts: [
      'git log --oneline --graph -15',
      'git stash list',
      'git branch -a',
      'git diff --cached',
      'git log --since="1 day ago" --oneline',
      'git shortlog -sn --no-merges | head -10',
    ],
  },
  {
    id: 'ogun',
    label: 'Chain',
    icon: 'Coins',
    color: 'text-amber-400',
    prompts: [
      'cast call 0x45f1af89486aeec2da0b06340cd9cd3bd741a15c "totalSupply()" --rpc-url https://polygon-rpc.com',
      'cast balance 0x519bed3fe32272fa8f1aecaf86dbfbd674ee703b --rpc-url https://polygon-rpc.com',
      'curl -s "https://api.polygonscan.com/api?module=account&action=txlist&address=0x519bed3fe32272fa8f1aecaf86dbfbd674ee703b&page=1&offset=5&sort=desc"',
    ],
  },
] as const

const CATEGORY_ICONS: Record<string, React.FC<{ className?: string }>> = {
  Zap, Code, Palette, Coins, Compass, Terminal, Shield,
}

// ─── Main Component ───────────────────────────────────────────────────
export function AgentStatusTicker() {
  const { agents, activeAgentCount, totalOgunConsumed, suiteVersion, setAgentStatus } = useAgentManager()
  const { ogunBalance, balance: polBalance } = useMagicContext()
  const me = useMe()
  const [expanded, setExpanded] = useState(false)
  const [fullscreen, setFullscreen] = useState(false)
  const [activeTab, setActiveTab] = useState<PanelTab>('terminal')
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null)
  // 3-column Tron cockpit — collapse state (desktop only, mobile uses tabs)
  const [colAgents, setColAgents] = useState(() => {
    if (typeof window === 'undefined') return true
    const s = localStorage.getItem('furl_col_agents'); return s !== null ? s === '1' : true
  })
  const [colTerminal, setColTerminal] = useState(() => {
    if (typeof window === 'undefined') return true
    const s = localStorage.getItem('furl_col_terminal'); return s !== null ? s === '1' : true
  })
  const [colGaming, setColGaming] = useState(() => {
    if (typeof window === 'undefined') return false
    const s = localStorage.getItem('furl_col_gaming'); return s !== null ? s === '1' : false
  })
  const [activeGame, setActiveGame] = useState<{ label: string; url: string } | null>(null)
  const [uptime, setUptime] = useState(0)
  const [cmdInput, setCmdInput] = useState('')
  const [termHistory, setTermHistory] = useState<{ text: string; type: LineType }[]>([
    { text: '✶ FURL v1.0.0 — THE ONE is live. type "help" or just talk to me.', type: 'system' },
  ])
  const inputRef = useRef<HTMLInputElement>(null)
  const termRef = useRef<HTMLDivElement>(null)
  const handleInputRef = useRef<(raw: string) => void>(() => {})

  // ─── Voice State ─────────────────────────────────────────────────
  const [voiceEnabled, setVoiceEnabled] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [selectedVoiceURI, setSelectedVoiceURI] = useState<string>('')
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([])
  const [showVoiceSettings, setShowVoiceSettings] = useState(false)
  const [showMdBook, setShowMdBook] = useState(false)
  const recognitionRef = useRef<any>(null)

  // ─── Jack-In State (SMITH streaming session) ───────────────────
  type JackMode = 'DISCONNECTED' | 'JACKED_IN' | 'CLI_BRIDGE'
  const [jackMode, setJackMode] = useState<JackMode>(() => {
    if (typeof window === 'undefined') return 'DISCONNECTED'
    return sessionStorage.getItem('furl_jack_mode') === 'CLI_BRIDGE' ? 'CLI_BRIDGE' : 'DISCONNECTED'
  })
  const [forgeMode, setForgeMode] = useState(false) // true = coding agent, false = chat
  const [jackHistory, setJackHistory] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([])
  const jackAbortRef = useRef<AbortController | null>(null)
  const jackStreamRef = useRef<string>('') // accumulates current streaming response

  // ─── CLI Bridge State (iframe-isolated terminal) ───────────────
  const xtermContainerMobileRef = useRef<HTMLDivElement>(null)
  const xtermContainerDesktopRef = useRef<HTMLDivElement>(null)
  const xtermIframeRef = useRef<HTMLIFrameElement | null>(null) // iframe hosting terminal
  const pendingCliUrlRef = useRef<string | null>(null) // URL waiting for container mount

  // ─── CLI Bridge: iframe-isolated terminal ───────────────────────────
  // Terminal runs in an iframe (/furl-terminal.html) so it survives
  // React re-renders and Next.js client-side navigation.
  // Only a hard refresh (F5) kills the iframe session.
  const connectCliBridge = useCallback(async (tunnelUrl: string) => {
    // Pick the visible container (mobile vs desktop)
    const pickContainer = () => {
      const mob = xtermContainerMobileRef.current
      const desk = xtermContainerDesktopRef.current
      if (mob && mob.getBoundingClientRect().height > 0) return mob
      if (mob && mob.offsetParent !== null) return mob
      if (desk && desk.getBoundingClientRect().height > 0) return desk
      if (desk && desk.offsetParent !== null) return desk
      return mob || desk
    }
    const container = pickContainer()
    if (!container) return

    // Clean up any previous iframe
    if (xtermIframeRef.current) {
      try { xtermIframeRef.current.contentWindow?.postMessage({ type: 'furl-disconnect' }, '*') } catch {}
      try { xtermIframeRef.current.remove() } catch {}
      xtermIframeRef.current = null
    }

    // Build iframe URL — tunnel URL passed as query param
    const cleanUrl = tunnelUrl.replace(/^https?:\/\//, '').replace(/\/+$/, '')
    const iframeSrc = `/furl-terminal.html?tunnel=${encodeURIComponent(cleanUrl)}`

    // Create iframe element
    const iframe = document.createElement('iframe')
    iframe.src = iframeSrc
    iframe.style.cssText = 'width:100%;height:100%;border:none;background:#0a0a0a;display:block'
    iframe.setAttribute('allow', 'clipboard-read; clipboard-write')
    iframe.title = 'FURL Terminal'

    // Append to container
    container.innerHTML = '' // clear any previous content
    container.appendChild(iframe)
    xtermIframeRef.current = iframe

    // Focus iframe on click
    const handleContainerClick = () => {
      try { iframe.contentWindow?.postMessage({ type: 'furl-focus' }, '*') } catch {}
    }
    container.addEventListener('click', handleContainerClick)

    // Re-fit on window resize
    const handleResize = () => {
      try { iframe.contentWindow?.postMessage({ type: 'furl-fit' }, '*') } catch {}
    }
    window.addEventListener('resize', handleResize)

    // Store cleanup function on the iframe element
    ;(iframe as any)._furlCleanup = () => {
      window.removeEventListener('resize', handleResize)
      container.removeEventListener('click', handleContainerClick)
    }
  }, [])

  const disconnectCliBridge = useCallback(() => {
    if (xtermIframeRef.current) {
      try { xtermIframeRef.current.contentWindow?.postMessage({ type: 'furl-disconnect' }, '*') } catch {}
      try {
        if ((xtermIframeRef.current as any)._furlCleanup) (xtermIframeRef.current as any)._furlCleanup()
        xtermIframeRef.current.remove()
      } catch {}
      xtermIframeRef.current = null
    }
  }, [])

  // When jackMode switches to CLI_BRIDGE, wait for xterm container to actually mount, then connect
  // On page refresh, restore tunnel URL from sessionStorage
  useEffect(() => {
    if (jackMode !== 'CLI_BRIDGE') return
    if (!pendingCliUrlRef.current) {
      const saved = sessionStorage.getItem('furl_tunnel_url')
      if (saved) pendingCliUrlRef.current = saved
      else return
    }
    const url = pendingCliUrlRef.current
    let attempt = 0
    const maxAttempts = 20 // 20 × 100ms = 2s max wait for DOM
    const tryConnect = () => {
      const mob = xtermContainerMobileRef.current
      const desk = xtermContainerDesktopRef.current
      const container = (mob && (mob.getBoundingClientRect().height > 0 || mob.offsetParent !== null))
        ? mob
        : (desk && (desk.getBoundingClientRect().height > 0 || desk.offsetParent !== null))
          ? desk
          : (mob || desk) // last resort: use whichever ref exists
      if (container) {
        pendingCliUrlRef.current = null
        connectCliBridge(url)
      } else if (++attempt < maxAttempts) {
        setTimeout(tryConnect, 100)
      }
    }
    // First attempt after a tick (DOM needs to commit)
    setTimeout(tryConnect, 50)
  }, [jackMode, colTerminal, activeTab, connectCliBridge])

  // Re-fit xterm when fullscreen toggles (CSS change, not window resize)
  useEffect(() => {
    if (xtermIframeRef.current) {
      setTimeout(() => { try { xtermIframeRef.current?.contentWindow?.postMessage({ type: 'furl-fit' }, '*') } catch {} }, 100)
    }
  }, [fullscreen])

  // Admin on localhost = voice settings access
  const isAdminLocal = typeof window !== 'undefined' && (
    window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  )

  // ─── Prompt Suggester State ─────────────────────────────────────────
  const [showPromptSuggester, setShowPromptSuggester] = useState(false)
  const [openCategory, setOpenCategory] = useState<string | null>(null)

  const realOgun = Number(ogunBalance) || 0
  const realPol = Number(polBalance) || 0

  const formatBalance = (num: number) => {
    if (num === 0) return '0'
    if (num < 0.01) return '< 0.01'
    if (num < 1000) return num.toFixed(2)
    return `${(num / 1000).toFixed(1)}K`
  }

  const bugCount = agents.filter(a => a.status === AGENT_STATUS.ERROR).length
  const relayCount = agents.filter(a =>
    (a.name === 'WHATSAPP' || a.name === 'NOSTR' || a.name === 'SMS') && a.status === AGENT_STATUS.ACTIVE
  ).length

  useEffect(() => {
    const start = Date.now()
    let interval: NodeJS.Timeout | undefined
    const startTimer = () => {
      interval = setInterval(() => setUptime(Math.floor((Date.now() - start) / 1000)), 5000)
    }
    const handleVisibility = () => {
      if (document.hidden) {
        if (interval) clearInterval(interval)
      } else {
        setUptime(Math.floor((Date.now() - start) / 1000))
        startTimer()
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)
    startTimer()
    return () => {
      if (interval) clearInterval(interval)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [])

  useEffect(() => {
    if (termRef.current) termRef.current.scrollTop = termRef.current.scrollHeight
  }, [termHistory])

  useEffect(() => {
    if (expanded && inputRef.current) setTimeout(() => inputRef.current?.focus(), 100)
  }, [expanded, activeTab])

  // Persist column collapse state to localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return
    localStorage.setItem('furl_col_agents', colAgents ? '1' : '0')
    localStorage.setItem('furl_col_terminal', colTerminal ? '1' : '0')
    localStorage.setItem('furl_col_gaming', colGaming ? '1' : '0')
  }, [colAgents, colTerminal, colGaming])

  // ─── Load Available Voices ─────────────────────────────────────────
  useEffect(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return
    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices()
      setAvailableVoices(voices)
      // Default to a natural English voice
      if (!selectedVoiceURI && voices.length > 0) {
        const preferred = voices.find(v => v.name.includes('Daniel')) ||
          voices.find(v => v.name.includes('Samantha')) ||
          voices.find(v => v.name.includes('Google') && v.lang.startsWith('en')) ||
          voices.find(v => v.lang.startsWith('en'))
        if (preferred) setSelectedVoiceURI(preferred.voiceURI)
      }
    }
    loadVoices()
    window.speechSynthesis.onvoiceschanged = loadVoices
  }, [selectedVoiceURI])

  // ─── FURL Speaks ───────────────────────────────────────────────────
  const furlSpeak = useCallback((text: string) => {
    if (!voiceEnabled || typeof window === 'undefined' || !window.speechSynthesis) return
    // Strip emoji/symbols for cleaner speech
    const clean = text.replace(/[✶●○✖⚡🟣🔗·›┌┐└┘│─]/g, '').replace(/\s+/g, ' ').trim()
    if (!clean) return
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(clean)
    const voice = availableVoices.find(v => v.voiceURI === selectedVoiceURI)
    if (voice) utterance.voice = voice
    utterance.rate = 0.95
    utterance.pitch = 0.85
    window.speechSynthesis.speak(utterance)
  }, [voiceEnabled, selectedVoiceURI, availableVoices])

  // ─── addLine must be declared BEFORE toggleMic to avoid TDZ ──────
  const addLine = useCallback((text: string, type: LineType = 'info') => {
    setTermHistory(prev => [...prev, { text, type }])
  }, [])

  // ─── Jack-In: Stream from SMITH session ─────────────────────────
  const streamFromSmith = useCallback((userMessage: string) => {
    // Abort any existing stream
    if (jackAbortRef.current) jackAbortRef.current.abort()
    const abortCtrl = new AbortController()
    jackAbortRef.current = abortCtrl

    // Add user message to history
    const newHistory = [...jackHistory, { role: 'user' as const, content: userMessage }]
    setJackHistory(newHistory)

    // Resolve keys from keybook
    const active = keybookGetActive()
    const anthropicKey = active?.type === 'CLAUDE' ? active.key || '' : ''
    const ocUrl = active?.type === 'OPENCLAW' ? active.url || '' : ''
    const ocToken = active?.type === 'OPENCLAW' ? active.token || '' : ''
    const useOpenClaw = active?.type === 'OPENCLAW' && ocUrl && ocToken
    const provider = useOpenClaw ? 'OPENCLAW' : 'CLAUDE'
    const label = active ? `${active.label} · ${active.type}` : 'Claude'

    addLine(`⟡ SMITH streaming (${label})...`, 'system')
    jackStreamRef.current = ''

    fetch('/api/agent/smith/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: newHistory,
        anthropicKey: anthropicKey || undefined,
        openclawUrl: ocUrl || undefined,
        openclawToken: ocToken || undefined,
        provider,
        mode: forgeMode ? 'FORGE' : 'CHAT',
      }),
      signal: abortCtrl.signal,
    })
      .then(response => {
        if (!response.ok) {
          return response.json().then(err => {
            addLine(`SMITH error: ${err.reason || 'unknown'}`, 'error')
            if (err.verdict === 'KEY_MISSING') {
              addLine(`  run: smith key sk-ant-... to set your API key`, 'info')
            }
          })
        }

        const reader = response.body?.getReader()
        if (!reader) {
          addLine('SMITH: streaming not supported in this browser', 'error')
          return
        }

        const decoder = new TextDecoder()
        let sseBuffer = ''
        let currentLineText = ''

        const processChunk = ({ done, value }: ReadableStreamReadResult<Uint8Array>): Promise<void> | void => {
          if (done) {
            // Stream complete — save assistant message to history
            if (jackStreamRef.current) {
              setJackHistory(prev => [...prev, { role: 'assistant', content: jackStreamRef.current }])
            }
            return
          }

          sseBuffer += decoder.decode(value, { stream: true })
          const lines = sseBuffer.split('\n')
          sseBuffer = lines.pop() || ''

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue
            try {
              const event = JSON.parse(line.slice(6))
              if (event.type === 'delta' && event.text) {
                jackStreamRef.current += event.text
                currentLineText += event.text

                // When we hit a newline, flush the current line
                if (currentLineText.includes('\n')) {
                  const parts = currentLineText.split('\n')
                  // All complete lines
                  for (let i = 0; i < parts.length - 1; i++) {
                    if (parts[i].trim()) addLine(parts[i], 'furl')
                  }
                  currentLineText = parts[parts.length - 1]
                }
              } else if (event.type === 'done') {
                // Flush remaining text
                if (currentLineText.trim()) addLine(currentLineText, 'furl')
                currentLineText = ''
                if (jackStreamRef.current) {
                  setJackHistory(prev => [...prev, { role: 'assistant', content: jackStreamRef.current }])
                }
                return
              } else if (event.type === 'error') {
                addLine(`SMITH error: ${event.text}`, 'error')
              }
            } catch {}
          }

          return reader.read().then(processChunk)
        }

        return reader.read().then(processChunk)
      })
      .catch(err => {
        if (err?.name !== 'AbortError') {
          addLine('SMITH unreachable — check your connection.', 'error')
        }
      })
  }, [jackHistory, addLine, forgeMode])

  // ─── Mic Toggle (Speech-to-Text) ──────────────────────────────────
  const toggleMic = useCallback(() => {
    if (!SpeechRecognitionAPI) {
      addLine('mic not supported in this browser', 'error')
      return
    }
    if (isListening) {
      recognitionRef.current?.stop()
      setIsListening(false)
      return
    }
    const recognition = new SpeechRecognitionAPI()
    recognition.continuous = false
    recognition.interimResults = false
    recognition.lang = 'en-US'
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript
      handleInputRef.current(transcript)
      setIsListening(false)
    }
    recognition.onerror = () => {
      setIsListening(false)
      addLine('mic error — try again', 'error')
    }
    recognition.onend = () => setIsListening(false)
    recognitionRef.current = recognition
    recognition.start()
    setIsListening(true)
    addLine('listening...', 'system')
  }, [isListening, addLine])

  const formatUptime = (s: number) => {
    if (s < 60) return `${s}s`
    if (s < 3600) return `${Math.floor(s / 60)}m ${s % 60}s`
    return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`
  }

  const handleToggleAgent = useCallback((name: string) => {
    const agent = agents.find(a => a.name === name)
    if (!agent || agent.status === AGENT_STATUS.DISABLED) return
    const newStatus = agent.status === AGENT_STATUS.ACTIVE ? AGENT_STATUS.IDLE : AGENT_STATUS.ACTIVE
    setAgentStatus(name as any, newStatus)
    setTermHistory(prev => [...prev, {
      text: `${name} → ${newStatus}`,
      type: newStatus === AGENT_STATUS.ACTIVE ? 'success' : 'info',
    }])
  }, [agents, setAgentStatus])

  // Unified input handler — commands start with /, otherwise it's chat
  const handleInput = useCallback((raw: string) => {
    let trimmed = raw.trim()
    if (!trimmed) return

    let cmd = trimmed.toLowerCase()

    // Command aliases — normalize before routing (fix trimmed too for correct slice offsets)
    if (cmd.startsWith('key ') && !cmd.startsWith('keys')) { trimmed = 'keys' + trimmed.slice(3); cmd = 'keys' + cmd.slice(3) }
    else if (cmd === 'key') { trimmed = 'keys'; cmd = 'keys' }
    if (cmd.startsWith('activate ')) { trimmed = 'wake' + trimmed.slice(8); cmd = 'wake' + cmd.slice(8) }
    else if (cmd === 'activate') { trimmed = 'wake'; cmd = 'wake' }

    // Check if it's a command (starts with known command word)
    const COMMANDS = ['help', 'status', 'balance', 'wake', 'sleep', 'clear', 'uptime', 'version', 'whoami', 'fingerprint', 'smith', 'copy', 'jack', 'exit', 'keys', 'tunnel', 'cheats', 'cheat', 'export', 'sessions', 'load', 'delete', 'academy']
    const firstWord = cmd.split(' ')[0]
    const isCommand = COMMANDS.includes(firstWord)

    if (isCommand) {
      addLine(`> ${trimmed}`, 'system')

      if (cmd === 'help') {
        addLine('  Commands:', 'system')
        addLine('  status       — all agent statuses', 'info')
        addLine('  balance      — OGUN + POL balance', 'info')
        addLine('  wake <name>  — activate an agent', 'info')
        addLine('  sleep <name> — pause an agent', 'info')
        addLine('  wake all     — activate all agents', 'info')
        addLine('  sleep all    — pause all (MANAGER stays)', 'info')
        addLine('  whoami       — THE ONE identity', 'info')
        addLine('  fingerprint  — verify authenticity', 'info')
        addLine('  clear        — clear terminal', 'info')
        addLine('  uptime       — session uptime', 'info')
        addLine('  version      — FURL version', 'info')
        addLine('  smith        — SMITH twin status + Claude API key', 'info')
        addLine('  keys         — keybook — manage saved API keys', 'info')
        addLine('  jack         — jack in to SMITH (streaming AI chat)', 'info')
        addLine('  jack forge   — jack in to SMITH FORGE (coding agent)', 'info')
        addLine('  jack cli     — CLI bridge via SoundChain relay (Claude Code)', 'info')
        addLine('  tunnel <url> — override tunnel URL (default: relay.soundchain.io)', 'info')
        addLine('  exit         — disconnect from any jack mode', 'info')
        addLine('  copy         — copy session to clipboard as markdown', 'info')
        addLine('  export       — save session to MdBook (persistent)', 'info')
        addLine('  sessions     — list saved MdBook sessions', 'info')
        addLine('  load <id>    — load a saved session into FURL', 'info')
        addLine('  delete <id>  — delete a saved MdBook session', 'info')
        addLine('  academy      — FURL Academy — agent learning dashboard', 'info')
        addLine('  cheats       — war room cheat codes (CLI paste-able)', 'info')
        addLine('', 'info')
        addLine('  Voice:', 'system')
        addLine('  🎙 Mic pill — tap to speak, FURL transcribes', 'info')
        addLine('  🔊 Speaker — toggle FURL voice replies', 'info')
        addLine('  ⚙ Voice picker — admin only on localhost', 'info')
        addLine('', 'info')
        addLine('  or just talk to me — I listen and I know things.', 'furl')
        furlSpeak('I am FURL. Ask me anything.')
      } else if (cmd === 'status') {
        agents.forEach(a => {
          const dot = a.status === AGENT_STATUS.ACTIVE ? '●' : a.status === AGENT_STATUS.ERROR ? '✖' : '○'
          addLine(`  ${dot} ${a.name.padEnd(12)} ${a.status.padEnd(8)} ${a.priority}`, a.status === AGENT_STATUS.ACTIVE ? 'success' : 'info')
        })
        const activeN = agents.filter(a => a.status === AGENT_STATUS.ACTIVE).length
        furlSpeak(`${agents.length} agents. ${activeN} active.`)
      } else if (cmd === 'balance') {
        addLine(`  ⚡ ${formatBalance(realOgun)} OGUN`, 'success')
        addLine(`  🟣 ${formatBalance(realPol)} POL`, 'info')
        furlSpeak(`${formatBalance(realOgun)} OGUN and ${formatBalance(realPol)} POL`)
      } else if (cmd === 'clear') {
        setTermHistory([{ text: '✶ terminal cleared — THE ONE persists.', type: 'system' }])
        return
      } else if (cmd === 'uptime') {
        addLine(`  ${formatUptime(uptime)}`, 'success')
      } else if (cmd === 'version') {
        addLine(`  FURL the PEARL v${suiteVersion}`, 'success')
        addLine(`  ${agents.length} agents · THE ONE · powered by OGUN`, 'info')
      } else if (cmd === 'whoami' || cmd === 'fingerprint') {
        addLine(`  ┌─ THE ONE ─────────────────────────┐`, 'system')
        addLine(`  │ Name:     ${FURL_IDENTITY.name}`, 'furl')
        addLine(`  │ Version:  v${FURL_IDENTITY.version}`, 'info')
        addLine(`  │ Origin:   ${FURL_IDENTITY.origin}`, 'info')
        addLine(`  │ Signature: ${FURL_IDENTITY.signature}`, 'success')
        addLine(`  │ Session:  ${FURL_IDENTITY.sessionId}`, 'info')
        addLine(`  │ Agents:   ${agents.length} registered`, 'info')
        addLine(`  │ Status:   VERIFIED ✓`, 'success')
        addLine(`  └───────────────────────────────────┘`, 'system')
      } else if (cmd.startsWith('wake ')) {
        const target = cmd.slice(5).trim().toUpperCase()
        if (target === 'ALL') {
          agents.forEach(a => { if (a.status === AGENT_STATUS.IDLE) setAgentStatus(a.name, AGENT_STATUS.ACTIVE) })
          addLine(`  all agents activated`, 'success')
        } else {
          const agent = agents.find(a => a.name === target)
          if (agent) { setAgentStatus(agent.name, AGENT_STATUS.ACTIVE); addLine(`  ${agent.name} → ACTIVE`, 'success') }
          else addLine(`  agent "${target}" not found`, 'error')
        }
      } else if (cmd.startsWith('sleep ')) {
        const target = cmd.slice(6).trim().toUpperCase()
        if (target === 'ALL') {
          agents.forEach(a => { if (a.status === AGENT_STATUS.ACTIVE && a.name !== 'MANAGER') setAgentStatus(a.name, AGENT_STATUS.IDLE) })
          addLine(`  all agents paused (MANAGER stays active)`, 'success')
        } else {
          const agent = agents.find(a => a.name === target)
          if (agent) { setAgentStatus(agent.name, AGENT_STATUS.IDLE); addLine(`  ${agent.name} → IDLE`, 'info') }
          else addLine(`  agent "${target}" not found`, 'error')
        }
      } else if (firstWord === 'smith') {
        const smithArgs = cmd.slice(6).trim()
        if (smithArgs.startsWith('key ')) {
          const newKey = trimmed.slice(10).trim()
          if (newKey.startsWith('sk-ant-')) {
            keybookAddEntry('claude', 'CLAUDE', { key: newKey })
            addLine(`  Claude API key saved to keybook. YOUR key, YOUR bill.`, 'success')
            addLine(`  SMITH will now use Claude AI for deeper answers.`, 'info')
            addLine(`  tip: use "keys" to manage all your saved keys.`, 'info')
          } else {
            addLine(`  invalid key — must start with sk-ant-`, 'error')
            addLine(`  get yours at console.anthropic.com/settings/keys`, 'info')
          }
        } else if (smithArgs === 'clear') {
          // Remove all Claude keys from keybook
          const kb = getKeybook()
          const claudeEntries = kb.entries.filter(e => e.type === 'CLAUDE')
          claudeEntries.forEach(e => keybookRemoveEntry(e.id))
          addLine(`  ${claudeEntries.length} Claude key(s) removed from keybook.`, 'info')
        } else if (smithArgs.startsWith('openclaw ')) {
          const ocArgs = smithArgs.slice(9).trim()
          if (ocArgs === 'clear') {
            const kb = getKeybook()
            const ocEntries = kb.entries.filter(e => e.type === 'OPENCLAW')
            ocEntries.forEach(e => keybookRemoveEntry(e.id))
            addLine(`  ${ocEntries.length} OpenClaw key(s) removed from keybook.`, 'info')
          } else {
            const parts = ocArgs.split(/\s+/)
            if (parts.length >= 2) {
              keybookAddEntry('openclaw', 'OPENCLAW', { url: parts[0], token: parts.slice(1).join(' ') })
              addLine(`  OpenClaw gateway saved to keybook. YOUR gateway, YOUR bill.`, 'success')
              addLine(`  SMITH will now query OpenClaw for deeper answers.`, 'info')
              addLine(`  tip: use "keys" to manage all your saved keys.`, 'info')
            } else {
              addLine(`  usage: smith openclaw <url> <token>`, 'error')
              addLine(`  example: smith openclaw http://localhost:18789 mytoken`, 'info')
            }
          }
        } else if (smithArgs === 'openclaw') {
          const active = keybookGetActive()
          const hasOC = active?.type === 'OPENCLAW'
          addLine(`  OpenClaw: ${hasOC ? 'ACTIVE' : 'NOT ACTIVE'}`, hasOC ? 'success' : 'info')
          if (hasOC && active?.url) addLine(`  gateway: ${active.url}`, 'info')
          addLine(``, 'info')
          addLine(`  smith openclaw <url> <token>  — add to keybook`, 'info')
          addLine(`  smith openclaw clear          — remove all`, 'info')
          addLine(`  keys                          — manage all keys`, 'info')
        } else {
          const active = keybookGetActive()
          const kb = getKeybook()
          const hasClaude = kb.entries.some(e => e.type === 'CLAUDE')
          const hasOC = kb.entries.some(e => e.type === 'OPENCLAW')
          addLine(`  SMITH — server-side twin of FURL`, 'furl')
          addLine(`  signature: SC-FURL-THE-ONE · runtime: SERVER`, 'info')
          const forgeParts = ['GitHub search', 'yarn registry', hasClaude ? 'Claude AI (BYOK)' : null, hasOC ? 'OpenClaw (BYOK)' : null].filter(s => s).join(' + ')
          addLine(`  FORGE: ${forgeParts}`, 'info')
          if (active) {
            addLine(`  active key: "${active.label}" (${active.type})`, 'success')
          }
          addLine(`  keybook: ${kb.entries.length} key(s) saved`, 'info')
          addLine(``, 'info')
          addLine(`  smith key <sk-ant-...>        — quick-add Claude key`, 'info')
          addLine(`  smith openclaw <url> <token>  — quick-add OpenClaw`, 'info')
          addLine(`  keys                          — manage all saved keys`, 'info')
          addLine(``, 'info')
          addLine(`  billing: your keys = your bill. zero cost to SoundChain.`, 'system')
          addLine(`  get a Claude key: console.anthropic.com/settings/keys`, 'info')
        }
      } else if (firstWord === 'keys') {
        const keysArgs = cmd.slice(5).trim()
        if (!keysArgs || keysArgs === 'list') {
          // Show keybook
          const kb = getKeybook()
          if (kb.entries.length === 0) {
            addLine('  keybook is empty. add a key:', 'info')
            addLine('  keys add <label> sk-ant-...                 — Claude key', 'info')
            addLine('  keys add <label> openclaw <url> <token>     — OpenClaw key', 'info')
          } else {
            addLine('  ┌─ KEYBOOK ──────────────────────────────────┐', 'system')
            kb.entries.forEach((e, i) => {
              const active = e.id === kb.activeId ? ' ►' : '  '
              const masked = e.type === 'CLAUDE' ? keybookMaskKey(e.key || '') : e.url || ''
              const color = e.id === kb.activeId ? 'success' : 'info'
              addLine(`  ${active} ${String(i + 1).padStart(2, ' ')}. ${e.label.padEnd(14)} ${e.type.padEnd(9)} ${masked}`, color)
            })
            addLine('  └─────────────────────────────────────────────┘', 'system')
            addLine('', 'info')
            addLine('  keys use <# or label>   — set active key', 'info')
            addLine('  keys add ...            — save new key', 'info')
            addLine('  keys rm <# or label>    — remove key', 'info')
          }
        } else if (keysArgs.startsWith('add ')) {
          const addArgs = trimmed.slice(9).trim()  // after "keys add "
          const parts = addArgs.split(/\s+/)
          if (parts.length < 2) {
            addLine('  usage: keys add <label> sk-ant-...', 'error')
            addLine('  usage: keys add <label> openclaw <url> <token>', 'error')
          } else {
            const label = parts[0]
            if (parts[1].startsWith('sk-ant-')) {
              const entry = keybookAddEntry(label, 'CLAUDE', { key: parts[1] })
              addLine(`  saved "${label}" (Claude) → keybook #${getKeybook().entries.length}`, 'success')
              if (getKeybook().activeId === entry.id) {
                addLine(`  auto-activated — this key is now live.`, 'info')
              }
            } else if (parts[1] === 'openclaw' && parts.length >= 4) {
              const entry = keybookAddEntry(label, 'OPENCLAW', { url: parts[2], token: parts.slice(3).join(' ') })
              addLine(`  saved "${label}" (OpenClaw) → keybook #${getKeybook().entries.length}`, 'success')
              if (getKeybook().activeId === entry.id) {
                addLine(`  auto-activated — this key is now live.`, 'info')
              }
            } else {
              addLine('  key must start with sk-ant- or use: keys add <label> openclaw <url> <token>', 'error')
            }
          }
        } else if (keysArgs.startsWith('use ')) {
          const target = trimmed.slice(9).trim()  // after "keys use "
          const entry = keybookSetActive(target)
          if (entry) {
            addLine(`  ► active key: "${entry.label}" (${entry.type})`, 'success')
          } else {
            addLine(`  key "${target}" not found. run "keys" to see all.`, 'error')
          }
        } else if (keysArgs.startsWith('rm ') || keysArgs.startsWith('remove ')) {
          const target = keysArgs.startsWith('rm ') ? trimmed.slice(8).trim() : trimmed.slice(12).trim()
          const removed = keybookRemoveEntry(target)
          if (removed) {
            addLine(`  removed "${removed.label}" (${removed.type})`, 'info')
            const kb = getKeybook()
            if (kb.activeId && kb.entries.find(e => e.id === kb.activeId)) {
              addLine(`  active key: "${kb.entries.find(e => e.id === kb.activeId)!.label}"`, 'info')
            } else if (kb.entries.length === 0) {
              addLine(`  keybook empty.`, 'info')
            }
          } else {
            addLine(`  key "${target}" not found.`, 'error')
          }
        } else {
          addLine('  keybook commands:', 'system')
          addLine('  keys                  — show all saved keys', 'info')
          addLine('  keys add <label> sk-ant-...              — save Claude key', 'info')
          addLine('  keys add <label> openclaw <url> <token>  — save OpenClaw key', 'info')
          addLine('  keys use <# or label> — set active key for SMITH', 'info')
          addLine('  keys rm <# or label>  — remove a key', 'info')
        }
      } else if (cmd.startsWith('tunnel')) {
        // Tunnel URL management — custom tunnel URL override (default: relay.soundchain built-in)
        const parts = trimmed.split(/\s+/)
        const subCmd = parts[1]?.toLowerCase()
        if (subCmd === 'clear' || subCmd === 'reset' || subCmd === 'default') {
          // Remove custom tunnel — revert to built-in relay
          const kb = getKeybook()
          kb.entries = kb.entries.filter(e => e.type !== 'TUNNEL')
          localStorage.setItem('furl_keybook', JSON.stringify(kb))
          addLine(`  tunnel reset to default: tunnel.soundchain.io`, 'success')
          addLine(`  now run: jack cli`, 'info')
        } else if (parts.length >= 2 && subCmd !== 'show') {
          const url = parts.slice(1).join(' ').replace(/\/+$/, '').replace(/^https?:\/\//, '')
          keybookAddEntry('tunnel', 'TUNNEL', { url })
          addLine(`  tunnel URL saved to keybook: ${url}`, 'success')
          addLine(`  now run: jack cli`, 'info')
        } else {
          const kb = getKeybook()
          const tunnelEntry = kb.entries.find(e => e.type === 'TUNNEL')
          if (tunnelEntry) {
            addLine(`  custom tunnel: ${tunnelEntry.url}`, 'info')
          } else {
            addLine(`  using default: tunnel.soundchain.io (built-in relay)`, 'info')
          }
          addLine(`  tunnel clear              — reset to default relay`, 'info')
          addLine(`  tunnel <custom-url>       — override with custom URL`, 'info')
        }
      } else if (cmd === 'jack cli' || cmd === 'smith jack cli') {
        // Jack CLI — xterm.js bridge via SoundChain relay or custom tunnel → ttyd → Claude Code
        // Whitelist check — tunnel gives shell access to the host machine
        const myHandle = (me?.handle || '').toLowerCase()
        if (!CLI_BRIDGE_WHITELIST.includes(myHandle)) {
          addLine(`  ⛔ access denied — jack cli is restricted`, 'error')
          addLine(`  your handle "${me?.handle || '(not logged in)'}" is not whitelisted`, 'error')
          return
        }
        const kb = getKeybook()
        const tunnelEntry = kb.entries.find(e => e.type === 'TUNNEL')
        // Default to SoundChain's permanent relay — no setup required
        const tunnelTarget = tunnelEntry?.url || 'tunnel.soundchain.io'
        // Force terminal visible before switching mode
        setColTerminal(true)
        setActiveTab('terminal')
        setForgeMode(false)
        // Store URL for the useEffect to pick up after DOM mounts
        pendingCliUrlRef.current = tunnelTarget
        // Persist so FURL auto-reconnects after page refresh
        try { sessionStorage.setItem('furl_jack_mode', 'CLI_BRIDGE'); sessionStorage.setItem('furl_tunnel_url', tunnelTarget) } catch {}
        setJackMode('CLI_BRIDGE')
        addLine(`  ┌─ CLI BRIDGE ─────────────────────────────┐`, 'system')
        addLine(`  │ connecting to ${tunnelTarget}`, 'info')
        addLine(`  │ full terminal session — your machine`, 'success')
        addLine(`  │ type "exit" in FURL to disconnect`, 'info')
        addLine(`  └──────────────────────────────────────────┘`, 'system')
        furlSpeak(`CLI bridge opening. Connecting to tunnel.`)
      } else if (cmd === 'jack forge' || cmd === 'smith jack forge') {
        // Jack in to SMITH FORGE — full coding agent with tools
        const active = keybookGetActive()
        const kb = getKeybook()
        if (!active && kb.entries.length === 0 && !process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY) {
          addLine(`  no API key in keybook. add one first:`, 'error')
          addLine(`  keys add <label> sk-ant-...              — Claude key`, 'info')
          addLine(`  or quick: smith key sk-ant-...`, 'info')
        } else {
          setJackMode('JACKED_IN')
          setForgeMode(true)
          setJackHistory([])
          jackStreamRef.current = ''
          const provider = active ? `${active.label} · ${active.type}` : 'platform key'
          addLine(`  ┌─ SMITH FORGE ─────────────────────────┐`, 'system')
          addLine(`  │ coding agent active (${provider})`, 'success')
          addLine(`  │ tools: read, write, edit, bash, git,`, 'info')
          addLine(`  │        glob, grep`, 'info')
          addLine(`  │ type a task. SMITH will use tools.`, 'info')
          addLine(`  │ type "exit" to disconnect`, 'info')
          addLine(`  └────────────────────────────────────────┘`, 'system')
          furlSpeak(`Forge active. SMITH has coding tools. Give me a task.`)
        }
      } else if (cmd === 'jack' || cmd === 'smith jack') {
        // Jack in to SMITH — streaming AI chat session (reads from keybook)
        const active = keybookGetActive()
        const kb = getKeybook()
        if (!active && kb.entries.length === 0 && !process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY) {
          addLine(`  no API key in keybook. add one first:`, 'error')
          addLine(`  keys add <label> sk-ant-...              — Claude key`, 'info')
          addLine(`  keys add <label> openclaw <url> <token>  — OpenClaw`, 'info')
          addLine(`  or quick: smith key sk-ant-...`, 'info')
          addLine(`  get a key at console.anthropic.com/settings/keys`, 'info')
        } else if (!active && kb.entries.length > 0) {
          addLine(`  ${kb.entries.length} key(s) in keybook but none active.`, 'error')
          addLine(`  run: keys use <# or label> to pick one.`, 'info')
        } else {
          setJackMode('JACKED_IN')
          setForgeMode(false)
          setJackHistory([])
          jackStreamRef.current = ''
          const provider = active ? `${active.label} · ${active.type}` : 'platform key'
          addLine(`  ┌─ JACKED IN ───────────────────────────┐`, 'system')
          addLine(`  │ SMITH session active (${provider})`, 'success')
          addLine(`  │ streaming conversation mode enabled`, 'info')
          addLine(`  │ type "exit" to disconnect`, 'info')
          addLine(`  └────────────────────────────────────────┘`, 'system')
          furlSpeak(`Jacked in. SMITH is live. Talk to me.`)
        }
      } else if (cmd === 'exit' || cmd === 'smith exit') {
        if (jackMode === 'CLI_BRIDGE') {
          disconnectCliBridge()
          try { sessionStorage.removeItem('furl_jack_mode'); sessionStorage.removeItem('furl_tunnel_url') } catch {}
          setJackMode('DISCONNECTED')
          addLine(`  ┌─ DISCONNECTED ─────────────────────────┐`, 'system')
          addLine(`  │ CLI bridge closed`, 'info')
          addLine(`  │ tunnel disconnected`, 'info')
          addLine(`  │ back to local FURL mode`, 'info')
          addLine(`  └────────────────────────────────────────┘`, 'system')
          furlSpeak(`CLI bridge closed. Back to local mode.`)
        } else if (jackMode === 'JACKED_IN') {
          if (jackAbortRef.current) jackAbortRef.current.abort()
          const wasForge = forgeMode
          setJackMode('DISCONNECTED')
          setForgeMode(false)
          setJackHistory([])
          jackStreamRef.current = ''
          addLine(`  ┌─ DISCONNECTED ─────────────────────────┐`, 'system')
          addLine(`  │ ${wasForge ? 'SMITH FORGE' : 'SMITH'} session ended`, 'info')
          addLine(`  │ conversation history cleared`, 'info')
          addLine(`  │ back to local FURL mode`, 'info')
          addLine(`  └────────────────────────────────────────┘`, 'system')
          furlSpeak(`Disconnected. Back to local mode.`)
        } else {
          addLine(`  not jacked in. type "jack" to connect.`, 'info')
        }
      } else if (cmd === 'cheats' || cmd === 'cheat') {
        if (jackMode === 'CLI_BRIDGE') {
          addLine('  ┌─ WAR ROOM CHEAT CODES ─────────────────┐', 'system')
          CLI_CHEAT_CATEGORIES.forEach(cat => {
            addLine(`  │ ${cat.label.toUpperCase()}`, 'info')
            cat.prompts.forEach(p => addLine(`  │  $ ${p}`, 'furl'))
          })
          addLine('  └──────────────────────────────────────────┘', 'system')
          addLine('  tap ✦ icon or type "cheats" to list again', 'info')
        } else {
          setShowPromptSuggester(true)
          setOpenCategory(null)
          addLine('  prompt suggester opened ↑', 'info')
        }
      } else if (cmd === 'copy') {
        // Export session as markdown to clipboard
        const now = new Date()
        const timestamp = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}_${String(now.getHours()).padStart(2,'0')}-${String(now.getMinutes()).padStart(2,'0')}`
        const header = `# FURL Session — ${timestamp}\n\n`
        const body = termHistory.map(line => {
          if (line.type === 'user') return `**YOU:** ${line.text}`
          if (line.type === 'furl') return `**FURL:** ${line.text}`
          if (line.type === 'system') return `> ${line.text}`
          if (line.type === 'error') return `> [ERROR] ${line.text}`
          if (line.type === 'success') return `> [OK] ${line.text}`
          return `${line.text}`
        }).join('\n')
        const md = header + body + '\n'
        navigator.clipboard.writeText(md).then(() => {
          addLine(`  session copied to clipboard (${termHistory.length} lines)`, 'success')
          addLine(`  paste into any text editor and save as .md`, 'info')
        }).catch(() => {
          addLine(`  clipboard access denied — try selecting text manually`, 'error')
        })
      } else if (cmd === 'export') {
        // Export current session to MdBook localStorage
        const label = args.join(' ').trim()
        if (termHistory.length < 2) {
          addLine('  nothing to export — start a conversation first', 'error')
          return
        }
        const session = mdBookExport(label, termHistory)
        addLine(`  session saved to MdBook as "${session.label}"`, 'success')
        addLine(`  ${session.lineCount} lines · id: ${session.id}`, 'info')
        addLine(`  type "sessions" to view all saved sessions`, 'info')
      } else if (cmd === 'sessions') {
        // List all saved MdBook sessions
        const book = getMdBook()
        if (book.sessions.length === 0) {
          addLine('  no saved sessions — type "export [label]" to save one', 'info')
          return
        }
        addLine(`  ┌── MdBookKeys (${book.sessions.length}/20) ──────────────┐`, 'system')
        book.sessions.slice().reverse().forEach((s, i) => {
          const date = new Date(s.timestamp)
          const ts = `${String(date.getMonth()+1).padStart(2,'0')}/${String(date.getDate()).padStart(2,'0')} ${String(date.getHours()).padStart(2,'0')}:${String(date.getMinutes()).padStart(2,'0')}`
          addLine(`  │ ${i+1}. "${s.label}" — ${s.lineCount} lines · ${ts}`, 'furl')
          addLine(`  │    id: ${s.id}`, 'info')
        })
        addLine('  └──────────────────────────────────────────┘', 'system')
        addLine('  load <id>  — restore a session', 'info')
        addLine('  delete <id> — remove a session', 'info')
      } else if (cmd === 'load') {
        // Load a saved MdBook session into terminal history
        const sessionId = args[0]?.trim()
        if (!sessionId) {
          addLine('  usage: load <session-id>', 'error')
          addLine('  type "sessions" to see available IDs', 'info')
          return
        }
        const book = getMdBook()
        const session = book.sessions.find(s => s.id === sessionId)
        if (!session) {
          // Try partial match
          const partial = book.sessions.find(s => s.id.includes(sessionId))
          if (partial) {
            addLine(`  loading session "${partial.label}" (${partial.lineCount} lines)...`, 'system')
            addLine('  ─── restored session ───', 'info')
            partial.markdown.split('\n').forEach(line => {
              if (line.startsWith('**YOU:**')) addLine(line.replace('**YOU:** ', ''), 'user')
              else if (line.startsWith('**FURL:**')) addLine(line.replace('**FURL:** ', ''), 'furl')
              else if (line.startsWith('> [ERROR]')) addLine(line.replace('> [ERROR] ', ''), 'error')
              else if (line.startsWith('> [OK]')) addLine(line.replace('> [OK] ', ''), 'success')
              else if (line.startsWith('> ')) addLine(line.replace('> ', ''), 'system')
              else if (line.startsWith('# ')) addLine(line, 'system')
              else if (line.trim()) addLine(line, 'info')
            })
            addLine('  ─── end of restored session ───', 'info')
            addLine(`  FURL has context from "${partial.label}". continue chatting.`, 'success')
          } else {
            addLine(`  session "${sessionId}" not found`, 'error')
            addLine('  type "sessions" to see available IDs', 'info')
          }
          return
        }
        addLine(`  loading session "${session.label}" (${session.lineCount} lines)...`, 'system')
        addLine('  ─── restored session ───', 'info')
        session.markdown.split('\n').forEach(line => {
          if (line.startsWith('**YOU:**')) addLine(line.replace('**YOU:** ', ''), 'user')
          else if (line.startsWith('**FURL:**')) addLine(line.replace('**FURL:** ', ''), 'furl')
          else if (line.startsWith('> [ERROR]')) addLine(line.replace('> [ERROR] ', ''), 'error')
          else if (line.startsWith('> [OK]')) addLine(line.replace('> [OK] ', ''), 'success')
          else if (line.startsWith('> ')) addLine(line.replace('> ', ''), 'system')
          else if (line.startsWith('# ')) addLine(line, 'system')
          else if (line.trim()) addLine(line, 'info')
        })
        addLine('  ─── end of restored session ───', 'info')
        addLine(`  FURL has context from "${session.label}". continue chatting.`, 'success')
      } else if (cmd === 'delete' && args[0]) {
        // Delete a saved MdBook session
        const sessionId = args[0].trim()
        const book = getMdBook()
        const session = book.sessions.find(s => s.id === sessionId || s.id.includes(sessionId))
        if (session && mdBookDelete(session.id)) {
          addLine(`  deleted session "${session.label}"`, 'success')
        } else {
          addLine(`  session "${sessionId}" not found`, 'error')
        }
      }

    } else if (firstWord === 'academy') {
      // ─── FURL ACADEMY — Agent Learning Dashboard ──────────────
      const academyArgs = cmd.slice(8).trim()
      const ACADEMY_URL = 'https://tunnel.soundchain.io/academy'

      if (!academyArgs || academyArgs === 'status') {
        // academy status — full dashboard
        addLine('  loading academy status...', 'system')
        fetch(`${ACADEMY_URL}/status`)
          .then(r => r.json())
          .then((data: any) => {
            addLine('  ┌─── FURL ACADEMY ──────────────────────────────┐', 'system')
            addLine(`  │  Sessions Logged:  ${String(data.sessionsLogged || 0).padStart(6)}                   │`, 'info')
            addLine(`  │  Active Sessions:  ${String(data.activeSessions || 0).padStart(6)}                   │`, 'info')
            addLine(`  │  Lessons Extracted: ${String(data.lessonsExtracted || 0).padStart(5)}                   │`, 'info')
            const kb = ((data.totalOutputBytes || 0) / 1024).toFixed(1)
            addLine(`  │  Total Data:       ${kb.padStart(6)} KB                │`, 'info')
            addLine('  │                                               │', 'system')
            addLine('  │  ── AGENT REPORT CARDS ──                     │', 'system')
            addLine('  │                                               │', 'system')

            const agents = data.agents || []
            for (const agent of agents) {
              const name = (agent.name || '').padEnd(5)
              const level = agent.level || 1
              const progress = agent.progress ?? 0
              const xp = agent.xp || 0
              const filled = Math.round(progress / 10)
              const bar = '▓'.repeat(filled) + '░'.repeat(10 - filled)
              addLine(`  │  ${name} ${bar}  L${level} (${progress}%)  ${xp} xp`, level >= 3 ? 'success' : 'info')
              if (agent.strengths?.length > 0) {
                addLine(`  │        strengths: ${agent.strengths.slice(0, 3).join(', ')}`, 'info')
              }
            }

            addLine('  │                                               │', 'system')
            addLine('  └───────────────────────────────────────────────┘', 'system')
            addLine('', 'info')
            addLine('  academy log     — recent session logs', 'info')
            addLine('  academy lessons — extracted lessons', 'info')
            addLine('  academy test    — run exam for all agents', 'info')
            addLine('  academy test <agent> — exam one agent', 'info')
          })
          .catch(() => {
            addLine('  ⚠ academy offline — relay not reachable', 'error')
            addLine('  check: curl https://tunnel.soundchain.io/health', 'info')
          })

      } else if (academyArgs === 'log' || academyArgs === 'logs') {
        // academy log — recent sessions
        addLine('  loading session log...', 'system')
        fetch(`${ACADEMY_URL}/sessions?limit=10`)
          .then(r => r.json())
          .then((data: any) => {
            const sessions = data.sessions || []
            addLine(`  ┌─── SESSION LOG (${sessions.length} of ${data.total || 0}) ─────────────┐`, 'system')
            if (sessions.length === 0) {
              addLine('  │  No sessions recorded yet.                   │', 'info')
              addLine('  │  Use "jack cli" to start a Claude Code       │', 'info')
              addLine('  │  session — it will be captured automatically. │', 'info')
            }
            for (const s of sessions) {
              const date = new Date(s.startedAt).toLocaleString()
              const dur = s.duration ? `${(s.duration / 60000).toFixed(1)}min` : '...'
              const tools = s.toolCalls || 0
              const kb = ((s.outputSize || 0) / 1024).toFixed(0)
              addLine(`  │  ${s.sessionId}  ${dur}  ${tools} tools  ${kb}KB`, tools > 5 ? 'success' : 'info')
              if (s.toolSequence?.length > 0) {
                addLine(`  │    ${s.toolSequence.slice(0, 8).join(' → ')}${s.toolSequence.length > 8 ? ' ...' : ''}`, 'info')
              }
            }
            addLine('  └───────────────────────────────────────────────┘', 'system')
          })
          .catch(() => addLine('  ⚠ academy offline', 'error'))

      } else if (academyArgs === 'lessons' || academyArgs === 'lesson') {
        // academy lessons — extracted lessons
        addLine('  loading lessons...', 'system')
        fetch(`${ACADEMY_URL}/lessons?limit=10`)
          .then(r => r.json())
          .then((data: any) => {
            const lessons = data.lessons || []
            const dist = data.distribution || {}
            addLine(`  ┌─── LESSONS (${lessons.length} of ${data.total || 0}) ──────────────────┐`, 'system')

            if (Object.keys(dist).length > 0) {
              addLine('  │  Category Distribution:', 'system')
              for (const [cat, count] of Object.entries(dist)) {
                addLine(`  │    ${String(cat).padEnd(18)} ${count}`, 'info')
              }
              addLine('  │', 'system')
            }

            if (lessons.length === 0) {
              addLine('  │  No lessons yet. Record Claude Code sessions │', 'info')
              addLine('  │  via "jack cli" — lessons auto-extract.      │', 'info')
            }

            for (const l of lessons) {
              addLine(`  │  📚 ${l.title}`, 'success')
              addLine(`  │     ${l.approach}`, 'info')
              if (l.keyInsight) addLine(`  │     💡 ${l.keyInsight}`, 'info')
            }
            addLine('  └───────────────────────────────────────────────┘', 'system')
          })
          .catch(() => addLine('  ⚠ academy offline', 'error'))

      } else if (academyArgs.startsWith('test')) {
        // academy test [agent] — run exam
        const agentArg = academyArgs.slice(5).trim().toUpperCase()
        const isAll = !agentArg || !['FURL', 'SMITH', 'FORGE'].includes(agentArg)

        if (isAll) {
          // Test all agents
          addLine('  running exam for all agents...', 'system')
          fetch(`${ACADEMY_URL}/exam-all`)
            .then(r => r.json())
            .then((data: any) => {
              if (data.error) {
                addLine(`  ⚠ ${data.error}`, 'error')
                return
              }
              addLine('  ┌─── EXAM RESULTS ─────────────────────────────┐', 'system')
              for (const exam of (data.exams || [])) {
                const emoji = exam.grade === 'PASS' ? '✅' : exam.grade === 'PARTIAL' ? '🟡' : '❌'
                addLine(`  │  ${emoji} ${exam.agentName.padEnd(6)} ${exam.grade.padEnd(8)} ${exam.score}/100`, exam.grade === 'PASS' ? 'success' : exam.grade === 'PARTIAL' ? 'info' : 'error')
                addLine(`  │     matched ${exam.matchedTools}/${exam.totalTools} tools`, 'info')
                addLine(`  │     expected: ${exam.expectedToolSequence.join(' → ')}`, 'info')
                addLine(`  │     got:      ${exam.agentToolSequence.join(' → ')}`, 'info')
              }
              addLine('  │                                               │', 'system')
              addLine('  │  ── UPDATED PROFILES ──                      │', 'system')
              for (const p of (data.profiles || [])) {
                const bar = '▓'.repeat(Math.round((p.progress || 0) / 10)) + '░'.repeat(10 - Math.round((p.progress || 0) / 10))
                addLine(`  │  ${p.name.padEnd(6)} ${bar}  L${p.level} (${p.progress}%)  ${p.xp} xp`, p.level >= 3 ? 'success' : 'info')
              }
              addLine('  └───────────────────────────────────────────────┘', 'system')
            })
            .catch(() => addLine('  ⚠ academy offline', 'error'))
        } else {
          // Test specific agent
          addLine(`  running exam for ${agentArg}...`, 'system')
          fetch(`${ACADEMY_URL}/exam?agent=${agentArg}`)
            .then(r => r.json())
            .then((data: any) => {
              if (data.error) {
                addLine(`  ⚠ ${data.error}`, 'error')
                return
              }
              const exam = data.exam
              const profile = data.profile
              const emoji = exam.grade === 'PASS' ? '✅' : exam.grade === 'PARTIAL' ? '🟡' : '❌'
              addLine(`  ┌─── ${agentArg} EXAM ──────────────────────────────┐`, 'system')
              addLine(`  │  ${emoji} Grade: ${exam.grade}  Score: ${exam.score}/100`, exam.grade === 'PASS' ? 'success' : 'info')
              addLine(`  │  Matched: ${exam.matchedTools}/${exam.totalTools} tools`, 'info')
              addLine(`  │  Expected: ${exam.expectedToolSequence.join(' → ')}`, 'info')
              addLine(`  │  Got:      ${exam.agentToolSequence.join(' → ')}`, 'info')
              if (profile) {
                addLine('  │', 'system')
                const bar = '▓'.repeat(Math.round((profile.progress || 0) / 10)) + '░'.repeat(10 - Math.round((profile.progress || 0) / 10))
                addLine(`  │  ${profile.name} ${bar}  L${profile.level} ${profile.xp} xp`, 'success')
                if (profile.strengths?.length) addLine(`  │  strengths: ${profile.strengths.join(', ')}`, 'info')
              }
              addLine('  └───────────────────────────────────────────────┘', 'system')
            })
            .catch(() => addLine('  ⚠ academy offline', 'error'))
        }

      } else {
        addLine('  FURL Academy commands:', 'system')
        addLine('  academy status  — dashboard + agent report cards', 'info')
        addLine('  academy log     — recent session recordings', 'info')
        addLine('  academy lessons — extracted coding lessons', 'info')
        addLine('  academy test    — exam all 3 agents', 'info')
        addLine('  academy test FURL  — exam specific agent', 'info')
      }

    } else {
      // Safety: catch accidental API key paste in chat mode
      if (/sk-ant-|sk_live_|moltbook_sk_/.test(trimmed)) {
        addLine(trimmed.slice(0, 12) + '...', 'user')
        addLine('  looks like an API key — not sending as chat.', 'error')
        addLine('  to save it: keys add <label> sk-ant-...', 'info')
        return
      }

      // Chat mode — behavior depends on jack-in state
      addLine(trimmed, 'user')

      if (jackMode === 'JACKED_IN') {
        // JACKED IN — route ALL chat through SMITH streaming session
        streamFromSmith(trimmed)
      } else {
        // Smart routing: use LLM when API key available, local knowledge as fallback
        const activeKey = keybookGetActive()
        const hasApiKey = activeKey || process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY

        if (hasApiKey) {
          // AUTO-SMITH: route through LLM with full SoundChain context
          // No need to manually "jack" — FURL is always intelligent when a key exists
          streamFromSmith(trimmed)
        } else {
          // No API key — fall back to local knowledge base
          const response = furlRespond(trimmed, agents, realOgun, realPol)
          response.answers.forEach(r => {
            addLine(r, 'furl')
            furlSpeak(r)
          })

          // Nudge user to add a key for full intelligence
          if (response.quality === 'FUZZY' || response.quality === 'NONE') {
            addLine(`  tip: add an API key for smarter answers — "keys add mykey sk-ant-..."`, 'info')
          }
        }
      }
    }
  }, [agents, setAgentStatus, realOgun, realPol, uptime, suiteVersion, addLine, furlSpeak, jackMode, forgeMode, streamFromSmith])

  // Keep ref synced so mic callback always uses latest handleInput
  useEffect(() => { handleInputRef.current = handleInput }, [handleInput])

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleInput(cmdInput)
      setCmdInput('')
    }
  }

  return (
    <div className="w-full">
      {/* Ticker Bar */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full h-7 flex items-center justify-between px-3 bg-black/80 border-b border-white/5 hover:bg-black/90 transition-colors cursor-pointer select-none"
      >
        <div className="flex items-center gap-1.5 text-[11px] font-mono">
          <span className={`${activeAgentCount > 0 ? 'text-cyan-400 animate-pulse' : 'text-gray-600'}`}>✶</span>
          {/* Desktop */}
          <span className="hidden sm:inline text-gray-400">
            <span className="text-white/80">{activeAgentCount}</span> active
            <span className="text-gray-600 mx-1">·</span>
            <span className="text-gray-600">↓</span> <span className={bugCount > 0 ? 'text-red-400' : 'text-white/80'}>{bugCount}</span> bugs
            <span className="text-gray-600 mx-1">·</span>
            <span className="text-gray-600">⚡</span> <span className="text-cyan-400">{formatBalance(realOgun)}</span> OGUN
            <span className="text-gray-600 mx-1">·</span>
            <span className="text-gray-600">🔗</span> <span className="text-white/80">{relayCount}</span> relays
            <span className="text-gray-600 mx-1">·</span>
            <span className="text-gray-500">{formatUptime(uptime)}</span>
          </span>
          {/* Mobile */}
          <span className="sm:hidden text-gray-400">
            <span className="text-white/80">{activeAgentCount}</span>
            <span className="text-gray-600 mx-1">·</span>
            <span className="text-gray-600">⚡</span><span className="text-cyan-400">{formatBalance(realOgun)}</span>
            <span className="text-gray-600 mx-1">·</span>
            <span className="text-gray-500">{formatUptime(uptime)}</span>
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className={`text-[9px] font-mono font-bold tracking-widest ${
            jackMode === 'CLI_BRIDGE' ? 'text-cyan-400'
              : jackMode === 'JACKED_IN' ? (forgeMode ? 'text-orange-400' : 'text-green-400') : 'text-cyan-500/60'
          }`}>
            {jackMode === 'CLI_BRIDGE' ? '⌁ CLI' : jackMode === 'JACKED_IN' ? (forgeMode ? '⟡ FORGE' : '⟡ SMITH') : 'FURL'}
          </span>
          {expanded ? <ChevronUp className="w-3 h-3 text-gray-500" /> : <ChevronDown className="w-3 h-3 text-gray-500" />}
        </div>
      </button>

      {/* Expanded Panel */}
      {expanded && (
        <div className={`bg-gray-900/95 backdrop-blur-md border-b overflow-hidden flex flex-col transition-all ${
          fullscreen
            ? 'fixed inset-0 z-[200] max-h-none border-none'
            : jackMode === 'CLI_BRIDGE'
              ? 'border-cyan-500/30 shadow-[0_0_20px_rgba(34,211,238,0.15)] max-h-[700px]'
              : jackMode === 'JACKED_IN'
                ? `${forgeMode ? 'border-orange-500/20 shadow-[0_0_15px_rgba(249,115,22,0.1)]' : 'border-green-500/20 shadow-[0_0_15px_rgba(34,197,94,0.1)]'} ${selectedAgent ? 'max-h-[600px]' : 'max-h-[520px]'}`
                : `border-white/10 ${selectedAgent ? 'max-h-[600px]' : 'max-h-[520px]'}`
        }`}>
          {/* Panel Header with Tabs */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-white/5 flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Terminal className="w-3.5 h-3.5 text-cyan-400" />
                <span className="text-xs font-mono text-cyan-400 font-bold tracking-wide">FURL</span>
                <span className="text-[10px] font-mono text-gray-500">v{suiteVersion}</span>
              </div>
              {/* Mobile Tabs (sm:hidden) — toggle between 3 columns */}
              <div className="flex items-center gap-1 ml-2 sm:hidden">
                <button
                  onClick={(e) => { e.stopPropagation(); setActiveTab('agents') }}
                  className={`text-[9px] font-mono px-2 py-0.5 rounded transition-colors ${
                    activeTab === 'agents' ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-gray-300'
                  }`}
                >
                  Agents
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setActiveTab('terminal') }}
                  className={`text-[9px] font-mono px-2 py-0.5 rounded transition-colors flex items-center gap-1 ${
                    activeTab === 'terminal' ? 'bg-cyan-500/20 text-cyan-400' : 'text-gray-500 hover:text-gray-300'
                  }`}
                >
                  <Terminal className="w-2.5 h-2.5" />
                  Terminal
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setActiveTab('gaming') }}
                  className={`text-[9px] font-mono px-2 py-0.5 rounded transition-colors flex items-center gap-1 ${
                    activeTab === 'gaming' ? 'bg-purple-500/20 text-purple-400' : 'text-gray-500 hover:text-gray-300'
                  }`}
                >
                  <Gamepad2 className="w-2.5 h-2.5" />
                  Gaming
                </button>
              </div>
              {/* Desktop label (hidden on mobile) */}
              <span className="hidden sm:inline text-[9px] font-mono text-gray-600 ml-2">COCKPIT</span>
            </div>
            <div className="flex items-center gap-2">
              {/* THE ONE badge */}
              <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/20" title={`Verified: ${FURL_IDENTITY.signature} · Session: ${FURL_IDENTITY.sessionId}`}>
                <Shield className="w-2.5 h-2.5 text-cyan-400" />
                <span className="text-[8px] font-mono text-cyan-400 font-bold">THE ONE</span>
              </div>
              {/* Fullscreen toggle (mobile only) */}
              <button
                onClick={(e) => { e.stopPropagation(); setFullscreen(!fullscreen) }}
                className="sm:hidden p-1 hover:bg-white/10 rounded transition-colors"
                title={fullscreen ? 'Exit fullscreen' : 'Fullscreen'}
              >
                {fullscreen
                  ? <Minimize2 className="w-3.5 h-3.5 text-cyan-400" />
                  : <Maximize2 className="w-3.5 h-3.5 text-gray-400" />
                }
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setFullscreen(false); setExpanded(false) }}
                className="p-1 hover:bg-white/10 rounded transition-colors"
              >
                <X className="w-3.5 h-3.5 text-gray-400" />
              </button>
            </div>
          </div>

          {/* ═══ TRON COCKPIT — 3 columns (desktop) / tabbed (mobile) ═══ */}

          {/* ─── MOBILE: Single column based on active tab ─── */}
          <div className="sm:hidden flex-1 overflow-hidden flex flex-col">
            {/* Mobile: Agents tab */}
            {activeTab === 'agents' && (
              <div className="flex-1 overflow-y-auto">
                <div className={`flex flex-col ${fullscreen ? '' : selectedAgent ? 'max-h-[360px]' : 'max-h-[200px]'} transition-all`}>
                  <div className="py-1 overflow-y-auto">
                    <div className="grid grid-cols-3 gap-0.5 px-1">
                      {agents.map(agent => {
                        const st = STATUS_CONFIG[agent.status]
                        return (
                          <button
                            key={agent.name}
                            onClick={() => setSelectedAgent(prev => prev === agent.name ? null : agent.name)}
                            className={`flex items-center gap-1.5 px-2 py-1.5 rounded-md text-left transition-colors ${
                              selectedAgent === agent.name
                                ? 'bg-cyan-500/15 ring-1 ring-cyan-500/30'
                                : 'hover:bg-white/5'
                            }`}
                          >
                            <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${st.dot} ${agent.status === AGENT_STATUS.ACTIVE ? 'animate-pulse' : ''}`} />
                            <span className={`font-mono text-[10px] font-bold truncate ${
                              selectedAgent === agent.name ? 'text-cyan-400' : 'text-white/80'
                            }`}>{agent.name}</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </div>
                {/* Mobile Agent Bottom Sheet */}
                {selectedAgent && (() => {
                  const agentData = agents.find(a => a.name === selectedAgent)
                  if (!agentData) return null
                  return (
                    <MobileAgentSheet
                      agentName={selectedAgent}
                      agent={agentData}
                      agents={agents}
                      onClose={() => setSelectedAgent(null)}
                      onNavigate={(name) => setSelectedAgent(name)}
                      onToggle={handleToggleAgent}
                    />
                  )
                })()}
              </div>
            )}
            {/* Mobile: Terminal tab */}
            {activeTab === 'terminal' && (
              jackMode === 'CLI_BRIDGE' ? (
                <div ref={xtermContainerMobileRef} className={`border-t border-cyan-500/20 flex-1 bg-[#0a0a0a] ${fullscreen ? 'min-h-0' : 'min-h-[300px] max-h-[450px]'}`} style={{ overflow: 'hidden' }} />
              ) : (
                <div ref={termRef} className={`border-t border-white/5 px-3 py-2 overflow-y-auto flex-1 ${fullscreen ? 'min-h-0' : 'min-h-[200px] max-h-[350px]'}`}>
                  {termHistory.map((line, i) => (
                    <TermLine key={i} text={line.text} type={line.type} />
                  ))}
                </div>
              )
            )}
            {/* Mobile: Gaming tab — opens in new tab to avoid memory crash */}
            {activeTab === 'gaming' && (
              <div className="border-t border-white/5 flex-1 overflow-hidden min-h-[200px] flex flex-col">
                <div className="overflow-y-auto px-3 py-3 flex-1">
                  <div className="grid grid-cols-2 gap-2">
                    {FURL_GAMES.map(game => (
                      <button key={game.label} onClick={() => window.open(game.url, '_blank', 'noopener')} className={`flex flex-col items-center gap-1.5 px-2 py-3 rounded-lg border ${game.bg} cursor-pointer hover:brightness-125 transition-all text-center`}>
                        <span className="text-lg">{game.emoji}</span>
                        <span className={`text-[10px] font-mono font-bold ${game.color}`}>{game.label}</span>
                        <span className="text-[8px] text-gray-500">{game.era}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ─── DESKTOP: 3-column Tron cockpit with chevron collapse ─── */}
          <div className="hidden sm:flex flex-1 overflow-hidden border-t border-white/5 relative">
            {/* LEFT: Agents column */}
            <div className={`flex flex-col border-r border-white/5 transition-all duration-200 overflow-hidden ${
              colAgents ? 'w-[200px] flex-shrink-0' : 'w-[28px] flex-shrink-0'
            }`}>
              <button
                onClick={() => setColAgents(!colAgents)}
                className="flex items-center gap-1 px-1.5 py-1 border-b border-white/5 hover:bg-white/5 transition-colors flex-shrink-0"
                title={colAgents ? 'Minimize Agents' : 'Expand Agents'}
              >
                {colAgents ? <ChevronLeft className="w-3 h-3 text-gray-500" /> : <ChevronRight className="w-3 h-3 text-cyan-400" />}
                {colAgents && <span className="text-[9px] font-mono text-gray-400 font-bold">AGENTS</span>}
              </button>
              {colAgents && (
                <div className="flex-1 overflow-y-auto py-0.5">
                  {agents.map(agent => (
                    <AgentRow
                      key={agent.name}
                      agent={agent}
                      onToggle={handleToggleAgent}
                      onSelect={(name) => setSelectedAgent(prev => prev === name ? null : name)}
                      isSelected={selectedAgent === agent.name}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* CENTER: Terminal column — always gets remaining space */}
            <div className={`flex flex-col flex-1 min-w-0 transition-all duration-200 ${
              !colTerminal ? 'max-w-[28px] flex-grow-0 flex-shrink-0' : ''
            }`}>
              <button
                onClick={() => setColTerminal(!colTerminal)}
                className="flex items-center gap-1 px-1.5 py-1 border-b border-white/5 hover:bg-white/5 transition-colors flex-shrink-0"
                title={colTerminal ? 'Minimize Terminal' : 'Expand Terminal'}
              >
                {!colTerminal ? <ChevronRight className="w-3 h-3 text-cyan-400" /> : <ChevronDown className="w-3 h-3 text-gray-500" />}
                {colTerminal && <span className="text-[9px] font-mono text-cyan-400 font-bold">TERMINAL</span>}
              </button>
              {colTerminal && (
                jackMode === 'CLI_BRIDGE' ? (
                  <div ref={xtermContainerDesktopRef} className="flex-1 min-h-[250px] max-h-[400px] bg-[#0a0a0a]" style={{ overflow: 'hidden' }} />
                ) : (
                  <div ref={termRef} className="flex-1 px-3 py-2 overflow-y-auto min-h-[180px] max-h-[350px]">
                    {termHistory.map((line, i) => (
                      <TermLine key={i} text={line.text} type={line.type} />
                    ))}
                  </div>
                )
              )}
            </div>

            {/* RIGHT: Gaming/P2P column */}
            <div className={`flex flex-col border-l border-white/5 transition-all duration-200 overflow-hidden ${
              colGaming ? (activeGame ? 'flex-1' : 'w-[180px] flex-shrink-0') : 'w-[28px] flex-shrink-0'
            }`}>
              <button
                onClick={() => { setColGaming(!colGaming); if (colGaming) setActiveGame(null) }}
                className="flex items-center gap-1 px-1.5 py-1 border-b border-white/5 hover:bg-white/5 transition-colors flex-shrink-0"
                title={colGaming ? 'Minimize Gaming' : 'Expand Gaming'}
              >
                {colGaming ? <ChevronRight className="w-3 h-3 text-gray-500" /> : <ChevronLeft className="w-3 h-3 text-purple-400" />}
                {colGaming && <span className="text-[9px] font-mono text-purple-400 font-bold">GAMING</span>}
                {colGaming && activeGame && (
                  <button onClick={(e) => { e.stopPropagation(); setActiveGame(null) }} className="ml-auto text-[9px] font-mono text-cyan-400 hover:text-white">← LIST</button>
                )}
              </button>
              {colGaming && (
                activeGame ? (
                  <iframe src={activeGame.url} className="flex-1 w-full border-0 bg-black" allow="autoplay; fullscreen; gamepad" sandbox="allow-scripts allow-same-origin allow-popups" title={activeGame.label} />
                ) : (
                  <div className="flex-1 overflow-y-auto py-1 px-1.5">
                    {FURL_GAMES.map(game => (
                      <button key={game.label} onClick={() => setActiveGame(game)} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-white/5 cursor-pointer transition-colors w-full text-left">
                        <span className="text-xs">{game.emoji}</span>
                        <span className={`text-[10px] font-mono font-bold ${game.color} truncate`}>{game.label}</span>
                      </button>
                    ))}
                  </div>
                )
              )}
            </div>

            {/* Desktop Agent Detail Panel overlay */}
            {selectedAgent && colAgents && (() => {
              const agentData = agents.find(a => a.name === selectedAgent)
              if (!agentData) return null
              return (
                <div className="absolute left-[200px] top-0 bottom-0 w-[300px] z-10 bg-black/95 border-r border-white/10 overflow-hidden">
                  <AgentDetailPanel
                    agentName={selectedAgent}
                    agent={agentData}
                    onClose={() => setSelectedAgent(null)}
                  />
                </div>
              )
            })()}
          </div>

          {/* Prompt Suggester / CLI Cheat Codes — micro-thin panel above input */}
          {showPromptSuggester && (() => {
            const isCli = jackMode === 'CLI_BRIDGE'
            const categories = isCli ? CLI_CHEAT_CATEGORIES : PROMPT_CATEGORIES
            return (
            <div className={`border-t ${isCli ? 'border-cyan-500/20 bg-[#060608]' : 'border-white/5 bg-black/60'} flex-shrink-0 max-h-[200px] overflow-y-auto`}>
              <div className="px-3 py-1.5">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5">
                    {isCli ? <Terminal className="w-3 h-3 text-cyan-400" /> : <Sparkles className="w-3 h-3 text-amber-400" />}
                    <span className={`text-[9px] font-mono font-bold uppercase tracking-wider ${isCli ? 'text-cyan-400' : 'text-amber-400'}`}>
                      {isCli ? 'War Room Cheat Codes' : 'Prompt Ideas'}
                    </span>
                  </div>
                  <button onClick={() => { setShowPromptSuggester(false); setOpenCategory(null) }} className="p-0.5 hover:bg-white/10 rounded">
                    <X className="w-3 h-3 text-gray-500" />
                  </button>
                </div>
                {/* Category pills */}
                <div className="flex items-center gap-1 mb-1.5 overflow-x-auto scrollbar-hide">
                  {categories.map(cat => {
                    const Icon = CATEGORY_ICONS[cat.icon]
                    const isOpen = openCategory === cat.id
                    return (
                      <button
                        key={cat.id}
                        onClick={() => setOpenCategory(isOpen ? null : cat.id)}
                        className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-mono whitespace-nowrap transition-all ${
                          isOpen
                            ? 'bg-white/10 border border-white/20 ' + cat.color
                            : 'bg-white/5 text-gray-500 hover:text-gray-300 hover:bg-white/10 border border-transparent'
                        }`}
                      >
                        {Icon && <Icon className="w-2.5 h-2.5" />}
                        {cat.label}
                      </button>
                    )
                  })}
                </div>
                {/* Expanded prompts for selected category */}
                {openCategory && (() => {
                  const cat = categories.find(c => c.id === openCategory)
                  if (!cat) return null
                  return (
                    <div className="space-y-0.5">
                      {cat.prompts.map((prompt, i) => (
                        <button
                          key={i}
                          onClick={() => {
                            if (isCli) {
                              navigator.clipboard.writeText(prompt).then(() => {
                                addLine(`  ✓ copied: ${prompt.length > 60 ? prompt.slice(0, 57) + '...' : prompt}`, 'success')
                              }).catch(() => {
                                addLine(`  clipboard denied — ${prompt}`, 'error')
                              })
                            } else {
                              setCmdInput(prompt)
                              inputRef.current?.focus()
                            }
                            setShowPromptSuggester(false)
                            setOpenCategory(null)
                          }}
                          className={`w-full text-left px-2 py-1 rounded text-[10px] font-mono transition-colors truncate ${
                            isCli ? 'text-cyan-400/70 hover:text-cyan-300 hover:bg-cyan-500/5' : 'text-gray-400 hover:text-white hover:bg-white/5'
                          }`}
                        >
                          <span className={isCli ? 'text-cyan-600 mr-1' : 'text-gray-600 mr-1'}>{isCli ? '$' : '›'}</span>
                          {prompt}
                        </button>
                      ))}
                    </div>
                  )
                })()}
                {/* Show all categories collapsed as quick picks when none selected */}
                {!openCategory && (
                  <div className="space-y-0.5">
                    {categories.map(cat => (
                      <button
                        key={cat.id}
                        onClick={() => {
                          const prompt = cat.prompts[0]
                          if (isCli) {
                            navigator.clipboard.writeText(prompt).then(() => {
                              addLine(`  ✓ copied: ${prompt.length > 60 ? prompt.slice(0, 57) + '...' : prompt}`, 'success')
                            }).catch(() => {
                              addLine(`  clipboard denied — ${prompt}`, 'error')
                            })
                          } else {
                            setCmdInput(prompt)
                            inputRef.current?.focus()
                          }
                          setShowPromptSuggester(false)
                        }}
                        className={`w-full text-left px-2 py-1 rounded text-[10px] font-mono transition-colors truncate ${
                          isCli ? 'text-cyan-400/70 hover:text-cyan-300 hover:bg-cyan-500/5' : 'text-gray-400 hover:text-white hover:bg-white/5'
                        }`}
                      >
                        <span className={`mr-1 ${cat.color}`}>{isCli ? '$' : '›'}</span>
                        {cat.prompts[0]}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            )
          })()}

          {/* Input Bar — CLI + Mic + Voice Toggle + Prompt Suggester */}
          <div className={`flex items-center gap-2 px-3 py-1.5 border-t flex-shrink-0 ${
            jackMode === 'CLI_BRIDGE'
              ? 'border-cyan-500/30 bg-[#0a0a0a]'
              : jackMode === 'JACKED_IN'
                ? forgeMode ? 'border-orange-500/30 bg-orange-950/20' : 'border-cyan-500/30 bg-cyan-950/20'
                : 'border-white/5 bg-black/40'
          }`}>
            {/* Prompt suggester / cheat codes toggle */}
            <button
              onClick={() => { setShowPromptSuggester(!showPromptSuggester); if (showPromptSuggester) setOpenCategory(null) }}
              className={`p-1 rounded transition-colors ${
                showPromptSuggester
                  ? jackMode === 'CLI_BRIDGE' ? 'bg-cyan-500/20 text-cyan-400' : 'bg-amber-500/20 text-amber-400'
                  : jackMode === 'CLI_BRIDGE' ? 'text-cyan-700 hover:text-cyan-400' : 'text-gray-700 hover:text-amber-400'
              }`}
              title={jackMode === 'CLI_BRIDGE' ? 'War Room cheat codes' : 'Prompt ideas'}
            >
              {jackMode === 'CLI_BRIDGE' ? <Terminal className="w-3 h-3" /> : <Sparkles className="w-3 h-3" />}
            </button>
            <span className={`text-[11px] font-mono font-bold ${
              jackMode === 'CLI_BRIDGE' ? 'text-cyan-400'
                : jackMode === 'JACKED_IN' ? (forgeMode ? 'text-orange-400' : 'text-green-400') : 'text-cyan-400'
            }`}>
              {jackMode === 'CLI_BRIDGE' ? '⌁' : jackMode === 'JACKED_IN' ? '⟡' : activeTab === 'terminal' ? '›' : '$'}
            </span>
            <input
              ref={inputRef}
              type="text"
              value={cmdInput}
              onChange={(e) => setCmdInput(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder={
                jackMode === 'CLI_BRIDGE' ? 'type "exit" to disconnect CLI bridge...'
                  : jackMode === 'JACKED_IN' ? (forgeMode ? 'give SMITH a coding task...' : 'talk to SMITH...')
                  : activeTab === 'terminal' ? 'talk to FURL...' : 'type a command...'
              }
              className="flex-1 bg-transparent text-[11px] font-mono text-white/90 placeholder-gray-600 outline-none border-none"
              spellCheck={false}
              autoComplete="off"
            />
            {/* Voice reply toggle — hidden in CLI bridge mode */}
            {jackMode !== 'CLI_BRIDGE' && (
              <button
                onClick={() => {
                  const next = !voiceEnabled
                  setVoiceEnabled(next)
                  if (!next && typeof window !== 'undefined') window.speechSynthesis?.cancel()
                }}
                className={`p-1 rounded transition-colors ${voiceEnabled ? 'bg-cyan-500/20 text-cyan-400' : 'text-gray-600 hover:text-gray-400'}`}
                title={voiceEnabled ? 'FURL voice ON — click to mute' : 'Enable FURL voice replies'}
              >
                {voiceEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
              </button>
            )}
            {/* Mic pill — hidden in CLI bridge mode */}
            {jackMode !== 'CLI_BRIDGE' && SpeechRecognitionAPI && (
              <button
                onClick={toggleMic}
                className={`p-1.5 rounded-full transition-all ${
                  isListening
                    ? 'bg-red-500/30 text-red-400 animate-pulse shadow-[0_0_12px_rgba(239,68,68,0.4)]'
                    : 'bg-white/5 text-gray-500 hover:text-cyan-400 hover:bg-cyan-500/10'
                }`}
                title={isListening ? 'Listening... tap to stop' : 'Hold to talk to FURL'}
              >
                {isListening ? <Mic className="w-3.5 h-3.5" /> : <MicOff className="w-3.5 h-3.5" />}
              </button>
            )}
            {/* MdBook session export pill */}
            <button
              onClick={() => setShowMdBook(!showMdBook)}
              className={`p-1 rounded transition-colors ${
                showMdBook ? 'bg-purple-500/20 text-purple-400' : 'text-gray-700 hover:text-purple-400'
              }`}
              title="MdBookKeys — saved sessions"
            >
              <Code className="w-3 h-3" />
            </button>
            {/* Admin voice settings gear — localhost only */}
            {isAdminLocal && (
              <button
                onClick={() => setShowVoiceSettings(!showVoiceSettings)}
                className={`p-1 rounded transition-colors ${showVoiceSettings ? 'text-cyan-400' : 'text-gray-700 hover:text-gray-500'}`}
                title="Voice settings (admin)"
              >
                <Settings className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* MdBook micro modal — saved sessions list */}
          {showMdBook && (
            <div className="px-3 py-2 border-t border-purple-500/20 bg-black/80 flex-shrink-0 max-h-48 overflow-y-auto scrollbar-hide">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[9px] font-mono text-purple-400 uppercase tracking-wider">MdBookKeys</span>
                <span className="text-[8px] font-mono text-gray-600">{getMdBook().sessions.length}/20 sessions</span>
              </div>
              {getMdBook().sessions.length === 0 ? (
                <p className="text-[10px] font-mono text-gray-600">no saved sessions — type &quot;export [label]&quot;</p>
              ) : (
                <div className="space-y-1">
                  {getMdBook().sessions.slice().reverse().map(s => {
                    const date = new Date(s.timestamp)
                    const ts = `${String(date.getMonth()+1).padStart(2,'0')}/${String(date.getDate()).padStart(2,'0')} ${String(date.getHours()).padStart(2,'0')}:${String(date.getMinutes()).padStart(2,'0')}`
                    return (
                      <div key={s.id} className="flex items-center gap-2 group">
                        <button
                          onClick={() => {
                            handleInput(`load ${s.id}`)
                            setShowMdBook(false)
                          }}
                          className="flex-1 text-left px-2 py-1 rounded text-[10px] font-mono text-gray-400 hover:text-white hover:bg-purple-500/10 transition-colors truncate"
                          title={`Load "${s.label}"`}
                        >
                          <span className="text-purple-400 mr-1">&#9656;</span>
                          {s.label} <span className="text-gray-600">· {s.lineCount}L · {ts}</span>
                        </button>
                        <button
                          onClick={() => {
                            mdBookDelete(s.id)
                            setShowMdBook(false)
                            setTimeout(() => setShowMdBook(true), 50)
                          }}
                          className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-gray-700 hover:text-red-400 transition-all"
                          title="Delete session"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
              <div className="mt-2 pt-1.5 border-t border-white/5 flex gap-2">
                <button
                  onClick={() => {
                    handleInput('export')
                    setShowMdBook(false)
                  }}
                  className="text-[9px] font-mono text-purple-400/70 hover:text-purple-300 transition-colors"
                >
                  + save current
                </button>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(getMdBook().sessions.map(s => s.markdown).join('\n---\n\n'))
                      .then(() => addLine('  all sessions copied to clipboard', 'success'))
                      .catch(() => addLine('  clipboard denied', 'error'))
                    setShowMdBook(false)
                  }}
                  className="text-[9px] font-mono text-gray-600 hover:text-gray-400 transition-colors"
                >
                  copy all
                </button>
              </div>
            </div>
          )}

          {/* Admin Voice Picker — localhost only */}
          {isAdminLocal && showVoiceSettings && (
            <div className="px-3 py-2 border-t border-white/5 bg-black/60 flex-shrink-0">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-[9px] font-mono text-gray-500 uppercase tracking-wider">FURL Voice</span>
                <span className="text-[8px] font-mono text-gray-700">admin · local only</span>
              </div>
              <select
                value={selectedVoiceURI}
                onChange={(e) => {
                  setSelectedVoiceURI(e.target.value)
                  // Preview the voice
                  if (typeof window !== 'undefined' && window.speechSynthesis) {
                    window.speechSynthesis.cancel()
                    const utterance = new SpeechSynthesisUtterance('I am FURL, THE ONE.')
                    const voice = availableVoices.find(v => v.voiceURI === e.target.value)
                    if (voice) utterance.voice = voice
                    utterance.rate = 0.95
                    utterance.pitch = 0.85
                    window.speechSynthesis.speak(utterance)
                  }
                }}
                className="w-full bg-gray-900 text-[10px] font-mono text-gray-300 border border-white/10 rounded px-2 py-1 outline-none focus:border-cyan-500/50"
              >
                {availableVoices.map(v => (
                  <option key={v.voiceURI} value={v.voiceURI}>
                    {v.name} ({v.lang}){v.localService ? '' : ' [network]'}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between px-3 py-1 border-t border-white/5 text-[10px] font-mono text-gray-600 flex-shrink-0">
            <span>
              {agents.filter(a => a.status === AGENT_STATUS.ACTIVE).length} running ·{' '}
              {agents.filter(a => a.status === AGENT_STATUS.IDLE).length} idle ·{' '}
              {agents.filter(a => a.status === AGENT_STATUS.ERROR).length} error ·{' '}
              {agents.filter(a => a.status === AGENT_STATUS.DISABLED).length} off
            </span>
            <span className="text-gray-700">FURL the PEARL · THE ONE · powered by OGUN</span>
          </div>
        </div>
      )}
    </div>
  )
}
