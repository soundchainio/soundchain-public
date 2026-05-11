import { useState } from 'react'
import Head from 'next/head'
import { openConnectModal, initAppKit } from 'lib/appkit'

export default function MintLanding() {
  const [connecting, setConnecting] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  async function handleConnect() {
    setConnecting(true)
    setMsg(null)
    try {
      await initAppKit()
      const opened = openConnectModal()
      if (!opened) {
        setMsg('Wallet connect not yet provisioned (Reown projectId pending).')
      }
    } finally {
      setConnecting(false)
    }
  }

  return (
    <>
      <Head>
        <title>SoundChain Mint</title>
      </Head>
      <main className="min-h-screen flex flex-col">
        <nav className="px-6 py-4 flex items-center justify-between border-b border-white/5">
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-mint-400 to-forge-500 bg-clip-text text-transparent">
              SoundChain Mint
            </span>
            <span className="text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-full bg-mint-500/15 text-mint-300 border border-mint-500/30">
              Beta
            </span>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="https://soundchain.io"
              className="text-xs text-gray-400 hover:text-mint-300 transition-colors"
            >
              ← soundchain.io
            </a>
            <button
              type="button"
              onClick={handleConnect}
              disabled={connecting}
              className="px-4 py-2 rounded-full bg-gradient-to-r from-mint-500 to-forge-500 text-white text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {connecting ? 'Connecting…' : 'Connect Wallet'}
            </button>
          </div>
        </nav>

        <section className="flex-1 flex items-center justify-center px-6 py-16">
          <div className="max-w-3xl text-center">
            <h1 className="text-5xl md:text-6xl font-extrabold mb-6 leading-tight">
              The forge for{' '}
              <span className="bg-gradient-to-r from-mint-400 via-mint-300 to-forge-400 bg-clip-text text-transparent">
                music NFTs
              </span>
            </h1>
            <p className="text-lg text-gray-400 mb-10 max-w-2xl mx-auto">
              Mint editions of your SCid-registered tracks, trade in the marketplace,
              stake OGUN, and earn royalties — all in one place. Spun off from{' '}
              <a href="https://soundchain.io" className="text-mint-300 hover:underline">
                soundchain.io
              </a>{' '}
              so the music platform stays focused and the forge can ship modern wallet UX.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                type="button"
                onClick={handleConnect}
                disabled={connecting}
                className="px-6 py-3 rounded-full bg-gradient-to-r from-mint-500 to-forge-500 text-white font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {connecting ? 'Connecting…' : 'Connect Wallet'}
              </button>
              <a
                href="/marketplace"
                className="px-6 py-3 rounded-full bg-white/5 border border-white/10 text-white font-semibold hover:bg-white/10 transition-colors"
              >
                Browse marketplace
              </a>
            </div>
            {msg && (
              <p className="mt-6 text-sm text-amber-300/80">{msg}</p>
            )}
          </div>
        </section>

        <section className="px-6 py-12 border-t border-white/5 grid md:grid-cols-3 gap-6 max-w-5xl mx-auto w-full">
          <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5">
            <div className="text-mint-300 text-xs uppercase tracking-widest mb-2">Mint</div>
            <h3 className="text-xl font-bold mb-2">Edition NFTs from SCid</h3>
            <p className="text-sm text-gray-400">
              Any track registered with a SoundChain ID (SCid) can be minted as a
              limited edition NFT on Polygon. Multi-collaborator splits supported.
            </p>
          </div>
          <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5">
            <div className="text-mint-300 text-xs uppercase tracking-widest mb-2">Marketplace</div>
            <h3 className="text-xl font-bold mb-2">Sub-1% fees</h3>
            <p className="text-sm text-gray-400">
              0.05% platform fee on sales. OpenSea charges 2.5%. Blur charges 0.5%.
              The lowest-fee music NFT marketplace in Web3 — by design.
            </p>
          </div>
          <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5">
            <div className="text-mint-300 text-xs uppercase tracking-widest mb-2">Stake</div>
            <h3 className="text-xl font-bold mb-2">OGUN + LP rewards</h3>
            <p className="text-sm text-gray-400">
              Stake OGUN single-asset or in the OGUN/POL LP. Streaming rewards
              earned on soundchain.io claim here via Merkle proofs.
            </p>
          </div>
        </section>

        <footer className="px-6 py-8 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-gray-500">
          <div>SoundChain Mint · Phase 2 shell (mint.soundchain.io)</div>
          <div className="flex items-center gap-4">
            <a href="https://soundchain.io" className="hover:text-mint-300">soundchain.io</a>
            <a href="https://arena.soundchain.io" className="hover:text-mint-300">arena.soundchain.io</a>
          </div>
        </footer>
      </main>
    </>
  )
}
