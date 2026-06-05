import { useState } from 'react'
import { X, ChevronDown, ChevronUp, Check, Zap } from 'lucide-react'
import { BOOKING_TOKENS, BookingToken } from 'lib/manager/escrow'

// ─── 24-token payment picker ──────────────────────────────────────────────────
// Renders like an allowlist mint's token chooser: BTC · ETH · SOL pinned at the
// top as the featured three, the full 24 (incl. YZY) behind an expand/collapse.
// Multi-select — a promoter can offer one or several tokens. A "live" badge marks
// tokens that settle straight to the escrow address now; "bridge" marks coins the
// artist confirms via ZetaChain.

interface TokenPickerModalProps {
  selected: string[]
  onToggle: (symbol: string) => void
  onClose: () => void
}

function TokenTile({ token, isSelected, onToggle }: { token: BookingToken; isSelected: boolean; onToggle: (s: string) => void }) {
  return (
    <button
      onClick={() => onToggle(token.symbol)}
      className={`relative flex items-center gap-2.5 rounded-xl border p-2.5 text-left transition-all ${
        isSelected
          ? 'border-cyan-400 bg-cyan-500/15'
          : 'border-gray-700 bg-white/5 hover:border-gray-500'
      }`}
    >
      <span className="text-2xl leading-none">{token.icon}</span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-semibold text-white">{token.display}</span>
          {token.rail === 'evm' ? (
            <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-500/15 px-1.5 text-[9px] font-medium text-emerald-300">
              <Zap className="h-2.5 w-2.5" /> live
            </span>
          ) : (
            <span className="rounded-full bg-violet-500/15 px-1.5 text-[9px] font-medium text-violet-300">bridge</span>
          )}
        </div>
        <p className="truncate text-[11px] text-gray-500">{token.name}</p>
      </div>
      {isSelected && (
        <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-cyan-400">
          <Check className="h-3 w-3 text-black" />
        </span>
      )}
    </button>
  )
}

export function TokenPickerModal({ selected, onToggle, onClose }: TokenPickerModalProps) {
  const [expanded, setExpanded] = useState(false)
  const featured = BOOKING_TOKENS.filter((t) => t.featured)
  const rest = BOOKING_TOKENS.filter((t) => !t.featured)

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose}>
      <div
        className="w-full max-w-md overflow-hidden rounded-t-2xl border border-cyan-500/20 bg-[#0a0d14] shadow-2xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-800 px-4 py-3">
          <div>
            <h3 className="text-sm font-semibold text-white">Choose payment token</h3>
            <p className="text-[11px] text-gray-500">{selected.length} selected · 24 supported</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-gray-400 hover:bg-white/10 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto px-4 py-3">
          {/* Featured: BTC · ETH · SOL */}
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-cyan-400/80">Top picks</p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {featured.map((t) => (
              <TokenTile key={t.symbol} token={t} isSelected={selected.includes(t.symbol)} onToggle={onToggle} />
            ))}
          </div>

          {/* Expand/collapse the remaining 21 */}
          <button
            onClick={() => setExpanded((v) => !v)}
            className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg border border-gray-700 bg-white/5 py-2 text-xs font-medium text-gray-300 hover:border-gray-500"
          >
            {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            {expanded ? 'Hide other tokens' : `Show all ${BOOKING_TOKENS.length} tokens`}
          </button>

          {expanded && (
            <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {rest.map((t) => (
                <TokenTile key={t.symbol} token={t} isSelected={selected.includes(t.symbol)} onToggle={onToggle} />
              ))}
            </div>
          )}
        </div>

        <div className="border-t border-gray-800 px-4 py-3">
          <button
            onClick={onClose}
            className="w-full rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 py-2.5 text-sm font-semibold text-black transition-opacity hover:opacity-90"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}

export default TokenPickerModal
