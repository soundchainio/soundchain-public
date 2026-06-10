import { useState } from 'react'
import { useRouter } from 'next/router'
import { isValidScid, parseScid } from 'lib/scid'
import { useMintPlayer } from 'contexts/MintPlayerProvider'

/**
 * CreateMintLauncher — the always-present "create" entry point for mint, the
 * parity counterpart to soundchain.io's ever-visible music-note composer pill.
 *
 * Mounted globally (in _app) so a floating "+ MINT" pill sits on every page,
 * and tapping it opens the full create flow inline as a modal (paste an SCid →
 * validate → forge) instead of making the user hunt for /mint. Sits above the
 * footer player when something's playing.
 */
export function CreateMintLauncher() {
  const router = useRouter()
  const { current } = useMintPlayer()
  const [open, setOpen] = useState(false)
  const [scidInput, setScidInput] = useState('')

  const parsed = parseScid(scidInput)
  const valid = isValidScid(scidInput)

  const go = () => {
    if (!valid) return
    setOpen(false)
    router.push(`/mint/${scidInput}`)
  }

  // Don't show the FAB on the dedicated forge pages — they already are the flow.
  const onForge = router.pathname === '/mint' || router.pathname.startsWith('/mint/')

  return (
    <>
      {!onForge && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Mint a track"
          className={`fixed right-4 z-[160] inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold uppercase tracking-widest text-black bg-neon-cyan hover:bg-white shadow-neon-cyan transition-all ${
            current ? 'bottom-[5.25rem]' : 'bottom-5'
          }`}
          style={{ clipPath: 'polygon(6px 0,100% 0,100% calc(100% - 6px),calc(100% - 6px) 100%,0 100%,0 6px)' }}
        >
          <span className="text-base leading-none">✦</span> MINT
        </button>
      )}

      {open && (
        <div
          className="fixed inset-0 z-[210] flex items-end sm:items-center justify-center bg-black/85 backdrop-blur-md p-0 sm:p-4"
          onClick={() => setOpen(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="relative w-full max-w-lg bg-ink-900 border border-neon-cyan/25 shadow-[0_0_60px_rgba(34,211,238,0.18)] sm:rounded-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-b border-white/5">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-sm bg-neon-cyan shadow-neon-cyan" />
                <span className="text-[10px] sm:text-xs font-mono uppercase tracking-[0.3em] text-neon-cyan">
                  FORGE · NEW EDITION
                </span>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="w-8 h-8 flex items-center justify-center text-sm text-neon-cyan border border-neon-cyan/40 hover:bg-neon-cyan hover:text-black transition-colors"
                style={{ clipPath: 'polygon(5px 0,100% 0,100% calc(100% - 5px),calc(100% - 5px) 100%,0 100%,0 5px)' }}
              >
                ✕
              </button>
            </div>

            <div className="px-4 sm:px-5 py-5 space-y-4">
              <div>
                <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight leading-none">
                  <span className="neon-text-cyan">MINT</span> <span className="text-white">A TRACK</span>
                </h2>
                <p className="text-xs text-gray-400 mt-1.5">
                  Paste an SCid from a soundchain.io track. Editions mint on-chain with the
                  platform fee + royalty split routed automatically.
                </p>
              </div>

              <label className="block">
                <span className="text-[10px] uppercase tracking-[0.25em] text-neon-cyan mb-2 block font-mono">SCid</span>
                <input
                  type="text"
                  value={scidInput}
                  onChange={(e) => setScidInput(e.target.value.toUpperCase())}
                  onKeyDown={(e) => { if (e.key === 'Enter') go() }}
                  placeholder="SC-POL-XXXX-XXXXXX"
                  spellCheck={false}
                  autoCorrect="off"
                  autoCapitalize="off"
                  autoFocus
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

              <button type="button" disabled={!valid} onClick={go} className="btn-neon w-full py-3 text-xs">
                {valid ? 'CONTINUE TO FORGE →' : 'PASTE A VALID SCid'}
              </button>

              <p className="text-[10px] font-mono text-gray-500 leading-relaxed pt-2 border-t border-white/5">
                Need an SCid? Upload a track at{' '}
                <a href="https://soundchain.io" className="text-neon-cyan hover:underline">soundchain.io</a>{' '}
                — every upload gets a SoundChain ID instantly, then flows here to mint editions on-chain.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
