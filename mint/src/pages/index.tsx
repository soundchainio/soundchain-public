import { useState, useMemo } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import { useAccount, useConnect, useDisconnect } from 'wagmi'

const TICKER_ITEMS = [
  'POLYGON · CHAIN 137',
  'PLATFORM FEE 0.05%',
  'EDITIONS V2 0x7EfC…9239',
  'OGUN 0x45f1…a15c',
  'PAYMENTS · POL · OGUN · USDC · USDT · ETH · LINK · AVAX',
  'PHASE 2 SHELL · CAPACITOR-READY',
]

export default function MintLanding() {
  const [msg, setMsg] = useState<string | null>(null)
  const { address, isConnected } = useAccount()
  const { connect, connectors, isPending: connecting, error: connectError } = useConnect()
  const { disconnect } = useDisconnect()

  // Prefer injected wallet (MetaMask, Coinbase Wallet, Rainbow extension);
  // fall back to whatever else wagmi has wired (WalletConnect mobile etc).
  const primaryConnector = useMemo(
    () => connectors.find((c) => c.id === 'injected') || connectors[0],
    [connectors]
  )

  async function handleConnect() {
    setMsg(null)
    if (isConnected) {
      disconnect()
      return
    }
    if (!primaryConnector) {
      setMsg('No wallet detected — install MetaMask, Coinbase Wallet, or Rainbow.')
      return
    }
    try {
      await connect({ connector: primaryConnector })
    } catch (err: any) {
      setMsg(err?.shortMessage || err?.message || 'Wallet connection cancelled.')
    }
  }

  return (
    <>
      <Head>
        <title>SoundChain Mint — Forge</title>
      </Head>
      <main className="min-h-screen flex flex-col">
        {/* Header */}
        <nav className="sticky top-0 z-30 px-4 sm:px-6 py-3 flex items-center justify-between border-b border-white/5 backdrop-blur-md bg-ink-900/70">
          <Link href="/" className="flex items-center gap-2">
            <span className="relative inline-flex">
              <span className="absolute -inset-1 rounded-sm bg-neon-cyan/30 blur-sm animate-pulse-neon" />
              <span className="relative w-2.5 h-2.5 rounded-sm bg-neon-cyan" />
            </span>
            <span className="text-lg sm:text-xl font-bold tracking-tight bg-gradient-to-r from-mint-400 via-neon-cyan to-forge-400 bg-clip-text text-transparent">
              SOUNDCHAIN <span className="text-neon-magenta">/</span> MINT
            </span>
            <span className="hidden sm:inline-block text-[9px] font-mono uppercase tracking-[0.2em] px-1.5 py-0.5 border border-neon-cyan/40 text-neon-cyan">
              PH.02
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <a
              href="https://soundchain.io"
              className="hidden sm:inline-block text-[10px] font-mono uppercase tracking-widest text-gray-500 hover:text-neon-cyan transition-colors"
            >
              ← soundchain.io
            </a>
            <button
              type="button"
              onClick={handleConnect}
              disabled={connecting}
              className="btn-neon text-[11px]"
              title={isConnected ? `Connected ${address?.slice(0, 6)}…${address?.slice(-4)}` : 'Connect wallet'}
            >
              {connecting ? 'LINKING…' : isConnected ? `${address?.slice(0, 6)}…${address?.slice(-4)}` : 'CONNECT'}
            </button>
          </div>
        </nav>

        {/* Live ticker */}
        <div className="relative overflow-hidden border-b border-neon-cyan/20 bg-ink-800/60">
          <div className="ticker-track flex gap-8 py-1.5 whitespace-nowrap text-[10px] font-mono uppercase tracking-[0.25em] text-neon-cyan/80 w-max">
            {[...TICKER_ITEMS, ...TICKER_ITEMS].map((item, i) => (
              <span key={i} className="flex items-center gap-3">
                <span className="text-neon-magenta">▰</span>
                {item}
              </span>
            ))}
          </div>
        </div>

        {/* Hero */}
        <section className="relative flex-1 flex items-center justify-center px-4 sm:px-6 py-14 sm:py-20">
          <div className="absolute inset-0 bg-holo-sweep opacity-50 pointer-events-none" />
          <div className="relative max-w-3xl text-center">
            <div className="inline-flex items-center gap-2 mb-5 px-3 py-1 border border-neon-mint/30 bg-neon-mint/5">
              <span className="w-1.5 h-1.5 bg-neon-mint rounded-full animate-pulse" />
              <span className="text-[10px] font-mono uppercase tracking-[0.25em] text-neon-mint">
                node online · polygon 137
              </span>
            </div>
            <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold mb-5 leading-[0.95] tracking-tight">
              <span className="neon-text-cyan">FORGE</span>
              <br />
              <span className="text-white">MUSIC</span>{' '}
              <span className="neon-text-magenta">NFT/s</span>
            </h1>
            <p className="text-sm sm:text-base text-gray-400 mb-8 max-w-xl mx-auto leading-relaxed">
              Mint editions of SCid-registered tracks · trade in sub-1% marketplace ·
              stake OGUN · earn royalties · <span className="text-neon-cyan">all on-chain</span>.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                type="button"
                onClick={handleConnect}
                disabled={connecting}
                className="btn-neon"
              >
                {connecting
                  ? '◌ LINKING…'
                  : isConnected
                  ? `◉ ${address?.slice(0, 6)}…${address?.slice(-4)} · DISCONNECT`
                  : '◤ CONNECT WALLET'}
              </button>
              <Link href="/marketplace" className="btn-ghost">
                ▣ ENTER MARKETPLACE
              </Link>
            </div>
            {msg && (
              <p className="mt-6 text-xs font-mono text-amber-300/80 tracking-wider">{msg}</p>
            )}
          </div>
        </section>

        {/* Feature panels — mobile-stack, 3-up at md */}
        <section className="relative px-4 sm:px-6 py-10 border-t border-white/5">
          <div className="max-w-5xl mx-auto grid sm:grid-cols-2 md:grid-cols-3 gap-4">
            {[
              {
                tag: 'MINT',
                tagColor: 'text-neon-cyan border-neon-cyan/40',
                title: 'Edition NFTs from SCid',
                body: 'Any SCid-registered track → limited edition on Polygon. Multi-collaborator splits supported, royalties on-chain.',
                href: '/mint',
                cta: 'OPEN FORGE',
              },
              {
                tag: 'MARKET',
                tagColor: 'text-neon-magenta border-neon-magenta/40',
                title: 'Sub-1% Fees',
                body: '0.05% platform fee on sales. OpenSea: 2.5%. Blur: 0.5%. The lowest-fee music NFT marketplace in Web3 — by design.',
                href: '/marketplace',
                cta: 'BROWSE LISTINGS',
              },
              {
                tag: 'STAKE',
                tagColor: 'text-neon-amber border-neon-amber/40',
                title: 'OGUN + LP Rewards',
                body: 'Single-asset OGUN or OGUN/POL LP. Streaming rewards from soundchain.io claim here via Merkle proofs.',
                href: '/stake',
                cta: 'STAKE OGUN',
              },
            ].map((card) => (
              <Link
                key={card.tag}
                href={card.href}
                className={`neon-panel ${card.tag === 'MARKET' ? 'neon-panel-magenta' : ''} hud-corners p-5 sm:p-6 flex flex-col group`}
              >
                <span className="hud-corner hud-corner-tl" />
                <span className="hud-corner hud-corner-tr" />
                <span className="hud-corner hud-corner-bl" />
                <span className="hud-corner hud-corner-br" />
                <div className={`inline-block self-start text-[9px] font-mono uppercase tracking-[0.25em] px-2 py-0.5 border ${card.tagColor} mb-3`}>
                  {card.tag}
                </div>
                <h3 className="text-lg font-bold mb-2 text-white">{card.title}</h3>
                <p className="text-xs sm:text-sm text-gray-400 leading-relaxed mb-4 flex-1">
                  {card.body}
                </p>
                <span className="text-[10px] font-mono uppercase tracking-[0.25em] text-neon-cyan group-hover:text-white transition-colors">
                  {card.cta} →
                </span>
              </Link>
            ))}
          </div>
        </section>

        {/* HUD stat strip */}
        <section className="px-4 sm:px-6 py-6 border-t border-white/5 bg-ink-800/40">
          <div className="max-w-5xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'CHAIN', value: 'POLYGON' },
              { label: 'FEE BPS', value: '5' },
              { label: 'TOKEN', value: 'OGUN' },
              { label: 'STATUS', value: 'LIVE' },
            ].map((s) => (
              <div key={s.label} className="border-l-2 border-neon-cyan/50 pl-3">
                <div className="text-[9px] font-mono uppercase tracking-[0.3em] text-gray-500">
                  {s.label}
                </div>
                <div className="text-sm sm:text-base font-mono tracking-wider text-neon-cyan mt-0.5">
                  {s.value}
                </div>
              </div>
            ))}
          </div>
        </section>

        <footer className="px-4 sm:px-6 py-6 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-3 text-[10px] font-mono uppercase tracking-[0.2em] text-gray-500">
          <div>// SC.MINT · PHASE 2 SHELL · mint.soundchain.io</div>
          <div className="flex items-center gap-4">
            <a href="https://soundchain.io" className="hover:text-neon-cyan transition-colors">soundchain.io</a>
            <a href="https://arena.soundchain.io" className="hover:text-neon-magenta transition-colors">arena.soundchain.io</a>
          </div>
        </footer>
      </main>
    </>
  )
}
