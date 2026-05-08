/**
 * The "Welcome to SoundChain" manual — content broadcast to every new signup
 * and (in returning-L1 variant) to existing users via the SoundChain-native
 * broadcast channel (`/api/broadcasts/send`).
 *
 * Format: Markdown-ish plaintext. Renders in:
 *   - Pulse inbox (treated as a regular message from @soundchain)
 *   - Web Push notification body (truncated to first ~120 chars)
 *   - Nostr NIP-17 encrypted DM (full body, gift-wrapped)
 *
 * This is THE deliverable Frank asked for ("draft up a doozy! make it like
 * a pitch deck meets the best ever to be made"). Voice: confident, warm,
 * "we built this for you" — not crypto-bro speak. Returning L1 variant
 * acknowledges the 2021 testnet contribution explicitly.
 *
 * Edit this file, redeploy, and the next broadcast picks up the new copy.
 * No external email service. No Mailchimp template. Just SoundChain pipes.
 */

const BASE_URL = 'https://soundchain.io'

// ─── New user welcome (auto-fires after signup completes) ─────────────────

export const WELCOME_NEW_USER = {
  fromHandle: 'soundchain',
  fromDisplayName: 'SoundChain',
  // Web Push notification — first line is the title, rest is the body preview
  pushTitle: 'Welcome to SoundChain 🎧',
  pushBody: 'Stream. Earn. Own. Tap to start your first 30 seconds and earn OGUN.',
  // Pulse inbox + Nostr DM body (full)
  body: `🎧 Welcome to SoundChain.

You just joined the music platform that pays artists AND listeners every time a song plays. No labels in the middle. No streaming pennies. Real ownership, real earn, real you.

Here's what to do in your first 5 minutes:

▸ STREAM A TRACK 30+ SECONDS — open ${BASE_URL}/radio. Listening earns OGUN automatically. Up to 50 OGUN per day, no signup gimmicks.

▸ DROP A POST — ${BASE_URL}/nodes. Share what you're listening to. Embed YouTube, Spotify, SoundCloud, Bandcamp. Reactions, replies, stories, the whole social layer.

▸ MINT YOUR FIRST TRACK — Upload audio at ${BASE_URL}/upload. Choose FREE (SCid certificate, 1× streaming rewards) or NFT mint (0.01 POL, 2× rewards, listable in your shop).

▸ SAY HI ON PULSE — ${BASE_URL}/pulse. End-to-end encrypted DMs over Nostr. Add your phone in Settings to get native text-style notifications.

▸ READ THE FULL MANUAL — ${BASE_URL}/manual. Every feature, every flow, no gatekeeping.

What makes SoundChain different from every "Web3 music" thing you've heard pitched:

• Streaming rewards are WIN-WIN — both creators (up to 100 OGUN/day per track) and listeners (up to 50 OGUN/day) earn. Listening pays.
• Every user is a vendor. Your profile has a built-in shop. List NFTs, set prices in POL or OGUN, accept payments straight to your wallet.
• Platform fee is 0.05% per sale + 0.05% on gas — the lowest in Web3. Compare: OpenSea 2.5%, Foundation 5%, Apple Music 30%.
• Multi-chain HD wallet auto-generated for you — Polygon, Ethereum, Base, Arbitrum, Optimism. Same address everywhere.
• CLARITY-Act-first compliance. Soulbound trophy NFTs, no wagering, real-stats Arena. We architected for the regulation BEFORE it landed.
• Native iOS + Android coming via Capacitor. Arena (sports companion app) standalone at arena.soundchain.io.

This message landed in your Pulse inbox AND on your lock screen because we built our own broadcast system on top of Pulse. No Mailchimp. No SendGrid. SoundChain users hear from SoundChain through SoundChain.

Welcome to L2.

— Frank, SoundChain`,
}

// ─── Returning L1 testnet invitee (mass-send to existing users) ───────────

export const WELCOME_RETURNING_L1 = {
  fromHandle: 'soundchain',
  fromDisplayName: 'SoundChain',
  pushTitle: 'Welcome back. L2 is live. 🚀',
  pushBody: 'You stress-tested the testnet in 2021. The platform you helped build just shipped. Tap in.',
  body: `🚀 You were on the bus when we were still building it.

In November 2021, we sent you a Notes-app tutorial walking through Mumbai testnet, MagicLink wallets, and minting NFTs as a proof-of-concept. You gave us the crash reports, the edge cases, the "why does this not work on iPhone" feedback that became the actual product.

Mumbai testnet was wiped before mainnet — testnet wallets, testnet NFTs, all gone by design. The platform you tested was a sketch. THIS is the real thing. And you helped build it.

What's still here:
• MagicLink OAuth login (Google / Discord / Twitch / Email)
• Embeddable posts (YouTube, Spotify, SoundCloud, Bandcamp)
• Profile pages, music tab, follow graph
• NFT minting on Polygon — mainnet now, not Mumbai

What's NEW since L1:
• OGUN token + WIN-WIN streaming rewards (creators AND listeners earn per play, up to 100/50 OGUN per day)
• HD wallets — multi-chain (Polygon, Ethereum, Base, Arbitrum, Optimism), auto-generated, free, no Magic per-user fees
• Stories + reels — IG/TikTok-style with attached audio
• Profile shops — every user is a vendor, no central marketplace
• Pulse — encrypted messaging app over Nostr (NIP-17), install as PWA for native push
• OGUN Radio — 24/7 NFT track rotation, browser-playable
• Arena — standalone sports companion app at arena.soundchain.io w/ live takes chat
• Native text-style DMs (Phase 2) — add your phone in Settings, friends with your number find you in their contacts
• 0.05% platform fee on everything — lowest in Web3

Your shortest path back:

▸ LOG IN with the same email you used for testnet at ${BASE_URL}/login. Magic recreates your wallet from your email — same address pattern as before, mainnet now.

▸ SAVE YOUR PHONE at ${BASE_URL}/settings — unlocks native text-style DMs and lets people who have your number find you on SC.

▸ READ THE FULL L2 MANUAL at ${BASE_URL}/manual — every surface, every flow, returning-L1 bridge content built in.

▸ DROP A "WHAT'S UP" POST at ${BASE_URL}/nodes — see the new social layer, react with the new emote stack, watch your post earn OGUN as people stream the audio you embed.

This message landed in your Pulse inbox AND on your lock screen because we built our own broadcast system on top of Pulse. No Mailchimp. No SendGrid. We don't outsource the conversation — SoundChain users hear from SoundChain through SoundChain.

You helped build this. Welcome back.

— Frank, SoundChain`,
}

// ─── Audience filter constants ─────────────────────────────────────────────

export const AUDIENCE = {
  ALL: 'all',                   // every user with a profile
  RETURNING_L1: 'returning_l1', // users created before mainnet cutover (Feb 2026)
  NEW_SIGNUPS: 'new_signups',   // users created after mainnet cutover
  SELF: 'self',                 // just the requesting admin (test-send)
} as const

export type Audience = typeof AUDIENCE[keyof typeof AUDIENCE]

// L1 testnet → mainnet cutover. Users created before this date are "L1 returnees."
// Set this to whatever the actual mainnet launch date was.
export const MAINNET_CUTOVER_ISO = '2026-02-01T00:00:00Z'
