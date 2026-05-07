/**
 * SoundChain L2 Manual — single-page guide for new users + returning L1
 * testnet invitees. Inspired structurally by Frank's Nov 2021 Apple Notes
 * testnet tutorial (Welcome → Account → Wallet → Mint → Buy → Social →
 * Have fun) but mapped to today's L2 surfaces (Magic + HD wallets, multi-
 * chain, SCid free uploads, NFT mint, WIN-WIN streaming rewards, Stories,
 * Pulse messaging, OGUN Radio, Arena standalone, profile shops).
 *
 * Lives at /manual. Sticky-side TOC on desktop, accordion on mobile.
 * Plain Next.js page — no Apollo dependency, no auth gate. Public read.
 * Returning L1 users deep-link straight here (`soundchain.io/manual`).
 */
import Head from 'next/head'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import {
  ArrowRight,
  CheckCircle2,
  Coins,
  Disc3,
  Gamepad2,
  Globe,
  Headphones,
  KeyRound,
  Mail,
  MessageCircle,
  Mic,
  Package,
  Play,
  Radio,
  Send,
  ShoppingBag,
  Sparkles,
  Trophy,
  Users,
  Wallet,
  Zap,
} from 'lucide-react'

interface Section {
  id: string
  num: number | null         // null = preface section (Welcome / Returning)
  label: string
  icon: React.ComponentType<{ className?: string }>
}

const SECTIONS: Section[] = [
  { id: 'welcome',          num: null, label: 'Welcome',           icon: Sparkles },
  { id: 'returning-l1',     num: null, label: 'Returning from L1?', icon: KeyRound },
  { id: 'account',          num: 1,    label: 'Create account',    icon: Mail },
  { id: 'wallet',           num: 2,    label: 'Your wallet',       icon: Wallet },
  { id: 'first-post',       num: 3,    label: 'First post',        icon: MessageCircle },
  { id: 'stories',          num: 4,    label: 'Stories + reels',   icon: Play },
  { id: 'mint',             num: 5,    label: 'Upload a track',    icon: Disc3 },
  { id: 'earn-ogun',        num: 6,    label: 'Earn OGUN',         icon: Coins },
  { id: 'shop',             num: 7,    label: 'Buy + sell',        icon: ShoppingBag },
  { id: 'pulse',            num: 8,    label: 'Pulse messaging',   icon: Send },
  { id: 'radio',            num: 9,    label: 'OGUN Radio',        icon: Radio },
  { id: 'arena',            num: 10,   label: 'Arena',             icon: Gamepad2 },
  { id: 'help',             num: null, label: 'Need help?',        icon: Users },
]

export default function ManualPage() {
  const [activeId, setActiveId] = useState<string>('welcome')

  // Track which section is in the viewport for the sticky TOC highlight
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) setActiveId(e.target.id)
        }
      },
      { rootMargin: '-30% 0% -60% 0%', threshold: 0 },
    )
    SECTIONS.forEach((s) => {
      const el = document.getElementById(s.id)
      if (el) observer.observe(el)
    })
    return () => observer.disconnect()
  }, [])

  return (
    <>
      <Head>
        <title>SoundChain Manual · Welcome to L2</title>
        <meta
          name="description"
          content="The official guide to SoundChain L2. Step-by-step walkthrough for new users + returning L1 testnet invitees. Account, wallet, posts, NFT mints, OGUN streaming rewards, profile shops, Pulse messaging, OGUN Radio, Arena."
        />
        <meta property="og:title" content="SoundChain L2 Manual" />
        <meta
          property="og:description"
          content="Stream. Earn. Own. The complete guide to SoundChain — from first post to first NFT mint to first OGUN earned."
        />
        <meta property="og:type" content="article" />
        <meta property="og:url" content="https://soundchain.io/manual" />
      </Head>

      <main className="min-h-screen bg-black text-white antialiased">
        {/* Hero */}
        <header className="relative border-b border-white/10 overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(34,211,238,0.18),transparent_55%),radial-gradient(ellipse_at_bottom_left,rgba(168,85,247,0.18),transparent_55%),radial-gradient(ellipse_at_bottom_right,rgba(236,72,153,0.18),transparent_55%)]" />
          <div className="relative max-w-5xl mx-auto px-6 pt-16 pb-14 sm:pt-24 sm:pb-20 text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-cyan-400/40 bg-cyan-400/10 text-[10px] font-mono uppercase tracking-[0.3em] text-cyan-300 mb-5">
              <Sparkles className="w-3 h-3" />
              <span>SoundChain L2 · Manual · v1</span>
            </div>
            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black leading-[1.05] tracking-tight mb-5">
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-cyan-300 via-purple-400 to-pink-400">
                Stream. Earn. Own.
              </span>
            </h1>
            <p className="text-base sm:text-lg text-white/70 max-w-2xl mx-auto leading-relaxed mb-8">
              The official walkthrough — from first login to first OGUN earned. Built for everyone, with extra love for L1 testnet invitees coming back to see what we built.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <a
                href="#account"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full font-black text-xs uppercase tracking-[0.2em] bg-gradient-to-r from-cyan-400 to-purple-500 text-black hover:shadow-[0_0_24px_rgba(168,85,247,0.5)] transition"
              >
                <Zap className="w-4 h-4" />
                Start at Step 1
              </a>
              <a
                href="#returning-l1"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full font-black text-xs uppercase tracking-[0.2em] border border-white/20 text-white/80 hover:border-cyan-400 hover:text-white transition"
              >
                <KeyRound className="w-4 h-4" />
                Returning from L1?
              </a>
            </div>
          </div>
        </header>

        {/* TOC + content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 sm:py-14 grid grid-cols-1 lg:grid-cols-[260px_1fr] lg:gap-10">
          {/* Sticky side TOC (lg+); inline at top on mobile */}
          <aside className="lg:sticky lg:top-6 lg:self-start mb-8 lg:mb-0">
            <nav className="rounded-xl border border-white/10 bg-white/[0.02] p-3 backdrop-blur">
              <div className="text-[10px] font-mono uppercase tracking-[0.3em] text-white/40 px-2 py-1.5 mb-1">
                Manual
              </div>
              <ul className="space-y-0.5">
                {SECTIONS.map((s) => {
                  const isActive = activeId === s.id
                  return (
                    <li key={s.id}>
                      <a
                        href={`#${s.id}`}
                        className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[12px] font-bold transition ${
                          isActive
                            ? 'bg-cyan-400/10 text-cyan-300 border border-cyan-400/30'
                            : 'text-white/60 hover:text-white hover:bg-white/5 border border-transparent'
                        }`}
                      >
                        <s.icon className="w-3.5 h-3.5 flex-shrink-0" />
                        <span className="flex-1">
                          {s.num !== null && <span className="font-mono text-[10px] text-white/40 mr-1.5">0{s.num}</span>}
                          {s.label}
                        </span>
                      </a>
                    </li>
                  )
                })}
              </ul>
            </nav>
          </aside>

          {/* Sections */}
          <div className="space-y-14 max-w-3xl">
            {/* WELCOME */}
            <Section id="welcome" eyebrow="Hi" title="Welcome to SoundChain L2">
              <p>
                Thanks for being here. SoundChain is the music platform that pays artists AND listeners — no algorithms, no labels, no gatekeepers between you and your sound. Every play earns. Every mint is yours. Every share spreads ownership, not extraction.
              </p>
              <p>
                If you&apos;re brand new, start at <a href="#account" className="text-cyan-300 hover:underline">Step 1</a> and follow the path. If you were part of the November 2021 testnet invite, jump to the <a href="#returning-l1" className="text-cyan-300 hover:underline">Returning from L1</a> section first — there&apos;s context you&apos;ll want before you log back in.
              </p>
              <Callout>
                <strong className="text-cyan-300">What changed since L1 testnet?</strong> The whole platform graduated to Polygon mainnet, OGUN launched as the native token, listening earns you crypto, every user is now a vendor with a built-in shop, we shipped a WhatsApp-style messaging app called Pulse, and a standalone sports-stats app called Arena. Your old testnet account was purged before mainnet — you&apos;ll start fresh, and that&apos;s a good thing.
              </Callout>
            </Section>

            {/* RETURNING L1 */}
            <Section id="returning-l1" eyebrow="L1 Invitees" title="Returning from L1 testnet">
              <p>
                Back in November 2021 we sent you a Notes-app tutorial walking through Mumbai testnet, MagicLink wallets, and minting NFTs as a proof-of-concept. That whole network was wiped before mainnet — testnet wallets, testnet NFTs, testnet POL, all gone by design. The platform you used was a sketch. This is the real thing.
              </p>
              <SubGrid>
                <Pillar icon={CheckCircle2} title="Still here">
                  Magic OAuth login (Google / Discord / Twitch / Email). Embeddable posts (YouTube / Spotify / SoundCloud / Bandcamp). Profile pages, music tab, follow graph. NFT minting on Polygon (mainnet now, not Mumbai).
                </Pillar>
                <Pillar icon={Sparkles} title="New since L1">
                  OGUN token + WIN-WIN streaming rewards. HD wallets (multi-chain, free). Stories + reels. Profile shops (every user is a vendor). Pulse encrypted messaging app. OGUN Radio (24/7 NFT rotation). Arena standalone (sports + chat). External wallet support (MetaMask, Coinbase, 300+ via WalletConnect).
                </Pillar>
                <Pillar icon={Trophy} title="What carried over">
                  The vision — paying artists fairly, on-chain ownership, no labels in the middle. The testnet invite list got first dibs on registration. The platform you helped stress-test in 2021 is what shipped.
                </Pillar>
              </SubGrid>
              <p>
                The shortest path back: <Link href="/login" className="text-cyan-300 hover:underline">log in with the same email</Link> you used for testnet (Magic recreates the wallet from your email — same address you had before). Then walk through the steps below to set up your L2 surfaces.
              </p>
            </Section>

            {/* STEP 1 — ACCOUNT */}
            <Section id="account" num={1} eyebrow="Step 1" title="Create your account">
              <p>
                Three doors in. Pick whichever fits how you already keep crypto:
              </p>
              <SubGrid>
                <Pillar icon={Mail} title="Magic OAuth (easiest)">
                  Google / Discord / Twitch / Email. No seed phrase to remember — Magic generates a custodial wallet from your login. Best for first-time users or anyone who wants &quot;just get me in.&quot;
                </Pillar>
                <Pillar icon={Wallet} title="External wallet (VIP door)">
                  MetaMask, Coinbase Wallet, Rainbow, Trust, Ledger, or any of 300+ wallets via WalletConnect. Best if you already hold crypto. Skips Magic entirely; you sign with your existing key.
                </Pillar>
                <Pillar icon={KeyRound} title="Passkey / Face ID">
                  Modern biometric login via WebAuthn. Sign in with Face ID on iPhone or Touch ID on Mac. Available after first login on any of the above.
                </Pillar>
              </SubGrid>
              <p>
                Go to <Link href="/login" className="text-cyan-300 hover:underline">soundchain.io/login</Link> — pick a door, follow the prompts. You&apos;ll land on the feed (<Link href="/nodes" className="text-cyan-300 hover:underline">/nodes</Link>) once auth completes.
              </p>
              <Callout>
                <strong>One account, all surfaces.</strong> The same login works for the feed, your wallet, the marketplace, Pulse, Radio, and Arena. You don&apos;t create separate accounts per feature.
              </Callout>
            </Section>

            {/* STEP 2 — WALLET */}
            <Section id="wallet" num={2} eyebrow="Step 2" title="Your wallet, your chains">
              <p>
                Your wallet panel lives at <Link href="/wallet" className="text-cyan-300 hover:underline">soundchain.io/wallet</Link>. Whatever door you came through, you have a Polygon address that holds POL (network gas) and OGUN (the SoundChain native token). New accounts also get an HD wallet — a single address that works on every EVM chain (Polygon, Ethereum, Base, Arbitrum, Optimism) without setup.
              </p>
              <SubGrid>
                <Pillar icon={Wallet} title="View balances">
                  Native token (POL/ETH/etc) + OGUN per chain. Switch chains via the chain dropdown.
                </Pillar>
                <Pillar icon={Coins} title="Send + receive">
                  Send POL or OGUN to anyone. Copy your address to receive. 0.05% platform fee on outbound transfers funds the treasury (the lowest in Web3 — for context, OpenSea takes 50× more).
                </Pillar>
                <Pillar icon={Sparkles} title="Connect more">
                  Link MetaMask or any external wallet alongside your Magic wallet. Pulse, Marketplace, and Mint will all use whichever wallet you select for the action.
                </Pillar>
              </SubGrid>
              <Callout>
                <strong>L1 returning users — your testnet wallet is gone.</strong> Magic regenerates a wallet from your email on first login, but it&apos;ll be a fresh mainnet address. Old testnet POL is unrecoverable (testnet was Mumbai; that network was deprecated and the funds were never real money). Your Polygon mainnet address is what matters now.
              </Callout>
            </Section>

            {/* STEP 3 — FIRST POST */}
            <Section id="first-post" num={3} eyebrow="Step 3" title="Drop your first post">
              <p>
                The compose button lives bottom-right on mobile (the cyan glowing pill) and top-bar on desktop. Tap it. Type a take. Drop a link. Your post lands on the feed at <Link href="/nodes" className="text-cyan-300 hover:underline">/nodes</Link> immediately.
              </p>
              <p>
                Embeddable URLs auto-expand into rich previews:
              </p>
              <ul className="list-none space-y-1.5 pl-0">
                {[
                  ['YouTube', 'standard videos, Shorts, Live, Music, Playlists, Clips, share links'],
                  ['Spotify', 'tracks, albums, playlists — full inline player'],
                  ['SoundCloud', 'any track or playlist URL'],
                  ['Bandcamp', 'tracks + albums w/ player'],
                  ['Vimeo', 'embedded video'],
                ].map(([name, desc]) => (
                  <li key={name} className="flex gap-3 text-sm">
                    <span className="text-cyan-300 font-mono mt-0.5">→</span>
                    <span><strong className="text-white">{name}</strong> <span className="text-white/60">— {desc}</span></span>
                  </li>
                ))}
              </ul>
              <p>
                Posts can include text (1000 chars), images, video, and audio (which becomes a streamable take). Replies thread inline like Twitter/X. Reactions use 100+ animated emotes (7TV, BTTV, FFZ, Twitch). Share to DMs, share to story, share externally — every post is sharable as <code className="text-pink-300 px-1 rounded bg-white/5">soundchain.io/posts/[id]</code>.
              </p>
            </Section>

            {/* STEP 4 — STORIES */}
            <Section id="stories" num={4} eyebrow="Step 4" title="Stories + reels">
              <p>
                Top of the feed has a stories rail — IG/TikTok-style. Tap your avatar bubble to create. Drag and drop a video or image (or attach an audio file from your wall and we&apos;ll generate a vinyl-style cover automatically). Stories expire in 24 hours by default.
              </p>
              <SubGrid>
                <Pillar icon={Play} title="Watch">
                  Tap any avatar bubble. Tap left/right or swipe to navigate. Tap center to pause. React with ❤️🔥🚀😂. Reply directly. Swipe down to close.
                </Pillar>
                <Pillar icon={Mic} title="Audio attach">
                  Wall posts with audio can be shared as a story — the cover art (or auto-generated vinyl card) becomes the visual; the audio plays underneath. New format that didn&apos;t exist on L1.
                </Pillar>
                <Pillar icon={Sparkles} title="Make permanent">
                  Pay 10 OGUN to lift a story off the 24hr expiry — it lives forever, on-chain proof, premium styling, never archives.
                </Pillar>
              </SubGrid>
            </Section>

            {/* STEP 5 — MINT */}
            <Section id="mint" num={5} eyebrow="Step 5" title="Upload a track — SCid free or NFT mint">
              <p>
                The Create flow has two tiers, both legitimate:
              </p>
              <SubGrid>
                <Pillar icon={Disc3} title="SCid only (FREE)">
                  No wallet required. We generate a SoundChain ID certificate (you can save the JSON to your device — your proof of upload). Earns 1× streaming rewards in OGUN. Your track appears in the feed, on your profile music tab, and on OGUN Radio rotation if claimed by the community.
                </Pillar>
                <Pillar icon={Trophy} title="NFT mint (0.01 POL/edition)">
                  Real on-chain edition. ERC-721 contract on Polygon. You set max supply (1–10,000), cover art, royalty splits across collaborators (up to 10 wallets, basis-point splits). Earns 2× streaming rewards. Listable in your shop. Collectors can buy at a price you set.
                </Pillar>
              </SubGrid>
              <p>
                Hit Create, choose your audio file (any iCloud / iPhone / cloud source works), fill in title + artist + genre + release year + cover, pick your tier, sign the transaction (only for NFT mints). IPFS pin happens server-side; you don&apos;t pay or wait for it.
              </p>
              <Callout>
                <strong>Royalty splits work post-mint, too.</strong> The <code className="text-pink-300 px-1 rounded bg-white/5">RoyaltySplitter</code> contract lets you add collaborators after the fact — no platform on Earth lets you retroactively add splits to an already-minted NFT, that&apos;s a SoundChain feature.
              </Callout>
            </Section>

            {/* STEP 6 — EARN OGUN */}
            <Section id="earn-ogun" num={6} eyebrow="Step 6" title="Earn OGUN — the WIN-WIN model">
              <p>
                Every track you upload earns OGUN every time someone (or you) streams it past 30 seconds. So does every track you LISTEN to (yes, you earn for listening — that&apos;s the WIN-WIN). Streaming any track for 30+ seconds triggers a coin-strike toast in the bottom-right showing your earn.
              </p>
              <SubGrid>
                <Pillar icon={Headphones} title="Listener rewards">
                  Up to 50 OGUN per day across all tracks you listen to. 30-second minimum per stream. Limit resets at UTC midnight.
                </Pillar>
                <Pillar icon={Mic} title="Creator rewards">
                  Up to 100 OGUN per day per track you uploaded. Other people streaming your music pays you. You streaming your OWN tracks also pays you (creator-side only — anti-farming caps the listener side at 0 for self-streams, but you still earn the creator share).
                </Pillar>
                <Pillar icon={Coins} title="Claim to wallet">
                  Earnings accumulate to a Piggy Bank dropdown in the top nav. Click &quot;Claim OGUN&quot; to batch-distribute to your Polygon wallet. Batched in 100s for gas efficiency.
                </Pillar>
              </SubGrid>
              <p>
                NFT-minted tracks earn 2× the rate of SCid-only tracks. Both still earn. Both flow through the same WIN-WIN. The 2× is the bonus for going on-chain.
              </p>
            </Section>

            {/* STEP 7 — SHOP */}
            <Section id="shop" num={7} eyebrow="Step 7" title="Buy + sell on profile shops">
              <p>
                Every user has a built-in shop tab on their profile (<code className="text-pink-300 px-1 rounded bg-white/5">/dex/users/[handle]?tab=shop</code>). Every user is a vendor. List NFT tracks you minted, set prices in POL or OGUN, accept payments straight to your wallet.
              </p>
              <SubGrid>
                <Pillar icon={ShoppingBag} title="Browse + buy">
                  Open any user&apos;s profile, tap Shop, browse what they&apos;re selling. Connect external wallet (MetaMask preferred for big buys), pick currency (POL or OGUN), confirm. Token transfer is on-chain.
                </Pillar>
                <Pillar icon={Package} title="List your own">
                  Mint an edition, then list. Set fixed price or accept offers. 0.05% platform fee (0.05% on the sale + 0.05% on gas — total 0.10%). Compare: OpenSea 2.5%, Rarible 2.5%, Foundation 5%.
                </Pillar>
                <Pillar icon={Trophy} title="Bundles + tokens">
                  Multi-NFT bundles (the L2 marketplace launched Feb 2026). Token marketplace lets users trade SC-issued tokens. Cross-chain via ZetaChain rolling out next phase.
                </Pillar>
              </SubGrid>
            </Section>

            {/* STEP 8 — PULSE */}
            <Section id="pulse" num={8} eyebrow="Step 8" title="Pulse — encrypted messaging">
              <p>
                <Link href="/pulse" className="text-cyan-300 hover:underline">soundchain.io/pulse</Link>. WhatsApp-dark themed. End-to-end encrypted via NIP-17 Nostr. Install as a PWA on iOS/Android (&quot;Add to Home Screen&quot;) for native-feel push notifications, lock-screen, CarPlay, Apple Watch routing.
              </p>
              <SubGrid>
                <Pillar icon={MessageCircle} title="DMs that survive">
                  Encrypted at the source. Routes via decentralized Nostr relays so even if SC&apos;s server is offline you can still send and receive. Ships natively in iMessage-style read receipts, typing indicators, voice messages, file sharing.
                </Pillar>
                <Pillar icon={Send} title="Calls">
                  Voice + video over WebRTC. Same identity as your DMs. No phone number needed.
                </Pillar>
                <Pillar icon={Globe} title="Bitchat bridge">
                  Pulse messages can also be received in the open-source Bitchat iOS app — same NIP-17 encryption, fully cross-platform.
                </Pillar>
              </SubGrid>
            </Section>

            {/* STEP 9 — RADIO */}
            <Section id="radio" num={9} eyebrow="Step 9" title="OGUN Radio — 24/7 NFT broadcast">
              <p>
                <Link href="/radio" className="text-cyan-300 hover:underline">soundchain.io/radio</Link>. The platform&apos;s own radio station — 600+ NFT tracks rotated continuously, browser-playable, no signup required. Listen for 30+ seconds to log a stream and earn OGUN automatically (if you&apos;re logged in).
              </p>
              <p>
                The currently-playing track posts hourly to the agent feed and Moltbook for AI agents to discover SoundChain music. Anyone can mint a track and have it surface in radio rotation — eligibility is automatic for any NFT track.
              </p>
            </Section>

            {/* STEP 10 — ARENA */}
            <Section id="arena" num={10} eyebrow="Step 10" title="Arena — the sports companion">
              <p>
                <a href="https://arena.soundchain.io" className="text-cyan-300 hover:underline" target="_blank" rel="noopener noreferrer">arena.soundchain.io</a> is SoundChain&apos;s sister app — sports stats hub for NBA / NHL / MLB / NFL / WNBA / F1 / Boxing / Soccer / NCAA / WWE / FIFA WC / Horse Racing, with live takes (chat takes that show up across every game in real time), real-time box scores, NBA-tier stat depth (Traditional, Advanced, Tracking, Hustle, Matchups, Shot Charts), and a fantasy + picks layer on top.
              </p>
              <p>
                Native iOS + Android app coming via Capacitor. Today, it&apos;s a web app and a PWA. Opens fully without a SoundChain account; sign in if you want to drop chat takes or play fantasy.
              </p>
              <Callout>
                <strong>The 2-site combo.</strong> Arena is a separate codebase + separate native app, but it&apos;s SoundChain&apos;s ecosystem. The native Arena app will be the gateway/portal — users come in there and can reach back to soundchain.io for music. No separate SC native app needed.
              </Callout>
            </Section>

            {/* HELP */}
            <Section id="help" eyebrow="Need help?" title="Where to find us">
              <p>
                We&apos;re building in the open. If something breaks, if a track won&apos;t mint, if a friend taps your share link and gets an error — tell us. Fixes ship the same day.
              </p>
              <SubGrid>
                <Pillar icon={MessageCircle} title="Pulse Frank">
                  Send a Pulse DM to <code className="text-pink-300 px-1 rounded bg-white/5">@frank-2242</code>. Direct line, end-to-end encrypted.
                </Pillar>
                <Pillar icon={Globe} title="Twitter / X">
                  <a href="https://twitter.com/SoundChainIO" target="_blank" rel="noopener noreferrer" className="text-cyan-300 hover:underline">@SoundChainIO</a> — announcements, ship logs, occasional dunks on legacy streaming.
                </Pillar>
                <Pillar icon={Trophy} title="Open source">
                  <a href="https://github.com/soundchainio/soundchain-public" target="_blank" rel="noopener noreferrer" className="text-cyan-300 hover:underline">github.com/soundchainio/soundchain-public</a> — full repo, file an issue or read the commit log.
                </Pillar>
              </SubGrid>
              <div className="mt-8 pt-8 border-t border-white/10 text-center">
                <p className="text-sm text-white/60 mb-4">
                  Welcome to L2. Let&apos;s take it to the moon.
                </p>
                <Link
                  href="/nodes"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full font-black text-xs uppercase tracking-[0.2em] bg-gradient-to-r from-cyan-400 to-purple-500 text-black hover:shadow-[0_0_24px_rgba(168,85,247,0.5)] transition"
                >
                  Open the feed
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </Section>
          </div>
        </div>

        <footer className="border-t border-white/10 py-10 text-center text-[10px] font-mono uppercase tracking-[0.3em] text-white/30">
          SoundChain L2 · v1 manual · {new Date().getFullYear()}
        </footer>
      </main>
    </>
  )
}

// ─── Subcomponents ──────────────────────────────────────────────────────

function Section({
  id,
  num,
  eyebrow,
  title,
  children,
}: {
  id: string
  num?: number
  eyebrow: string
  title: string
  children: React.ReactNode
}) {
  return (
    <section id={id} className="scroll-mt-24">
      <div className="flex items-center gap-2 mb-3">
        {num !== undefined && (
          <span className="font-mono text-[11px] tracking-[0.3em] text-cyan-300/80">
            STEP {String(num).padStart(2, '0')}
          </span>
        )}
        <span className="text-[10px] font-mono uppercase tracking-[0.3em] text-white/40">
          · {eyebrow}
        </span>
      </div>
      <h2 className="text-2xl sm:text-3xl font-black tracking-tight mb-5 text-white">
        {title}
      </h2>
      <div className="space-y-4 text-[15px] leading-relaxed text-white/75 [&_p]:text-white/75 [&_a]:transition">
        {children}
      </div>
    </section>
  )
}

function SubGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 my-5">
      {children}
    </div>
  )
}

function Pillar({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 hover:border-cyan-400/30 transition">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-4 h-4 text-cyan-300" />
        <span className="text-[12px] font-black uppercase tracking-[0.15em] text-white">
          {title}
        </span>
      </div>
      <p className="text-[13px] leading-relaxed text-white/65">{children}</p>
    </div>
  )
}

function Callout({ children }: { children: React.ReactNode }) {
  return (
    <div className="my-5 rounded-xl border border-cyan-400/20 bg-gradient-to-r from-cyan-400/[0.04] via-purple-400/[0.04] to-pink-400/[0.04] p-4 text-[14px] leading-relaxed text-white/80">
      {children}
    </div>
  )
}
