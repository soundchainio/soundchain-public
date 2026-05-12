/**
 * Mint landing — gateway to the forge.
 *
 * Cyberpunk shell matching /marketplace + /marketplace/[id]. Lets the user
 * paste an SCid, validates format, and continues to the per-SCid mint flow.
 */
import Head from 'next/head'
import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/router'
import { isValidScid, parseScid } from 'lib/scid'

export default function MintLanding() {
  const router = useRouter()
  const [scidInput, setScidInput] = useState('')
  const parsed = parseScid(scidInput)
  const valid = isValidScid(scidInput)

  return (
    <>
      <Head>
        <title>Forge — SoundChain Mint</title>
      </Head>
      <main className="min-h-screen flex flex-col pb-20">
        <nav className="sticky top-0 z-30 px-3 sm:px-5 py-2.5 flex items-center justify-between border-b border-white/5 backdrop-blur-md bg-ink-900/75">
          <Link href="/" className="flex items-center gap-2 min-w-0">
            <span className="w-2 h-2 rounded-sm bg-neon-cyan shadow-neon-cyan flex-shrink-0" />
            <span className="text-sm sm:text-base font-bold tracking-tight bg-gradient-to-r from-mint-400 via-neon-cyan to-forge-400 bg-clip-text text-transparent truncate">
              SC<span className="text-neon-magenta">/</span>MINT
            </span>
          </Link>
          <Link href="/marketplace" className="btn-neon text-[10px] py-1.5 px-2.5">
            MARKET
          </Link>
        </nav>

        <section className="px-3 sm:px-5 py-4 sm:py-6 border-b border-white/5 bg-ink-800/40">
          <div className="max-w-3xl mx-auto">
            <div className="inline-block text-[8px] font-mono uppercase tracking-[0.3em] px-1.5 py-0.5 border text-neon-mint border-neon-mint/40 mb-1.5">
              FORGE · ON-CHAIN
            </div>
            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight leading-none">
              <span className="neon-text-cyan">MINT</span>{' '}
              <span className="text-white">EDITION</span>
            </h1>
            <p className="text-xs sm:text-sm text-gray-400 mt-2 max-w-xl">
              Paste an SCid from a track on soundchain.io. Editions mint on-chain
              with platform fee + royalty split routed automatically.
            </p>
          </div>
        </section>

        <section className="px-3 sm:px-5 py-6 max-w-3xl mx-auto w-full">
          <div className="neon-panel hud-corners p-5 sm:p-6 space-y-4">
            <span className="hud-corner-tl" />
            <span className="hud-corner-tr" />
            <span className="hud-corner-bl" />
            <span className="hud-corner-br" />

            <label className="block">
              <span className="text-[10px] uppercase tracking-[0.25em] text-neon-cyan mb-2 block font-mono">
                SCid
              </span>
              <input
                type="text"
                value={scidInput}
                onChange={(e) => setScidInput(e.target.value.toUpperCase())}
                placeholder="SC-POL-XXXX-XXXXXX"
                spellCheck={false}
                autoCorrect="off"
                autoCapitalize="off"
                className="w-full px-4 py-3 bg-ink-900 border border-white/10 focus:border-neon-cyan/60 text-white font-mono text-sm outline-none transition-colors"
                style={{ clipPath: 'polygon(6px 0,100% 0,100% calc(100% - 6px),calc(100% - 6px) 100%,0 100%,0 6px)' }}
              />
            </label>

            {scidInput && (
              <div className="text-xs font-mono">
                {valid && parsed ? (
                  <div className="space-y-1 text-neon-mint">
                    <div>✓ valid SCid · ready to forge</div>
                    <div className="text-white/50 text-[10px] tracking-widest">
                      CHAIN: {parsed.chainCode} · EDITION: {parsed.edition} · SEQ: {parsed.sequence}
                    </div>
                  </div>
                ) : (
                  <div className="text-red-400">✗ invalid format — expected SC-POL-XXXX-XXXXXX</div>
                )}
              </div>
            )}

            <button
              type="button"
              disabled={!valid}
              onClick={() => valid && router.push(`/mint/${scidInput}`)}
              className="btn-neon w-full py-3 text-xs"
            >
              {valid ? 'CONTINUE TO FORGE →' : 'PASTE A VALID SCid'}
            </button>

            <p className="text-[10px] font-mono text-gray-500 leading-relaxed pt-2 border-t border-white/5">
              Need an SCid? Upload a track at{' '}
              <a href="https://soundchain.io" className="text-neon-cyan hover:underline">
                soundchain.io
              </a>{' '}
              — every uploaded track gets a SoundChain ID instantly. Same SCid
              flows here when you're ready to mint editions on-chain.
            </p>
          </div>

          <div className="mt-6 grid sm:grid-cols-3 gap-3">
            <div className="neon-panel-mint p-4">
              <div className="text-[9px] uppercase tracking-[0.3em] text-neon-mint mb-1.5">CHAINS</div>
              <div className="text-sm font-bold text-white">Polygon mainnet</div>
              <div className="text-[10px] text-gray-500 mt-1">ETH · BASE · ARB · OP coming</div>
            </div>
            <div className="neon-panel-magenta p-4">
              <div className="text-[9px] uppercase tracking-[0.3em] text-neon-magenta mb-1.5">FEE</div>
              <div className="text-sm font-bold text-white">0.05%</div>
              <div className="text-[10px] text-gray-500 mt-1">Lowest in Web3 music NFTs</div>
            </div>
            <div className="neon-panel p-4">
              <div className="text-[9px] uppercase tracking-[0.3em] text-neon-cyan mb-1.5">ROYALTIES</div>
              <div className="text-sm font-bold text-white">EIP-2981</div>
              <div className="text-[10px] text-gray-500 mt-1">On every secondary sale</div>
            </div>
          </div>
        </section>
      </main>
    </>
  )
}
