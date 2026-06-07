import { useState } from 'react'
import { Globe, X, Search } from 'lucide-react'
import { MANAGER_LOCALES, baseLang } from 'lib/managerI18n'

// ─── Language welcome gate ────────────────────────────────────────────────────
// First thing a visitor sees on a pro's manager page: pick your language. Once
// chosen, the agent communicates in it (typed + spoken) and the choice is
// remembered. With 42 locales the list MUST stay inside a bounded, scrollable
// modal with an always-available escape (X / Continue / tap-backdrop) — otherwise
// the grid overflows the screen and traps the visitor (the bug Frank hit).

interface Props {
  current: string
  onSelect: (code: string) => void
}

export function ManagerLanguageGate({ current, onSelect }: Props) {
  const currentBase = baseLang(current)
  const [q, setQ] = useState('')
  const ql = q.trim().toLowerCase()
  const list = ql ? MANAGER_LOCALES.filter(l => l.name.toLowerCase().includes(ql) || l.code.includes(ql)) : MANAGER_LOCALES
  const currentName = MANAGER_LOCALES.find(l => l.code === currentBase)?.name

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/85 backdrop-blur-md p-4"
      onClick={() => onSelect(currentBase)}
    >
      <div
        className="w-full max-w-md max-h-[85vh] flex flex-col rounded-2xl border border-cyan-500/25 bg-gradient-to-b from-[#0b0f1c] to-[#06070d] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header (close always reachable) */}
        <div className="relative flex flex-col items-center text-center px-6 pt-6 pb-3 flex-shrink-0">
          <button
            onClick={() => onSelect(currentBase)}
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="w-12 h-12 rounded-full bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center mb-3">
            <Globe className="w-6 h-6 text-cyan-400 animate-pulse" />
          </div>
          <h2 className="text-lg font-semibold text-white">Choose your language</h2>
          <p className="text-xs text-gray-400 mt-1">The manager will speak &amp; type in your language.</p>
        </div>

        {/* Search */}
        <div className="px-6 pb-2 flex-shrink-0">
          <div className="flex items-center gap-2 rounded-lg border border-gray-700 bg-gray-900 px-3 py-2">
            <Search className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search language…"
              className="flex-1 bg-transparent text-sm text-gray-200 placeholder-gray-600 focus:outline-none"
            />
          </div>
        </div>

        {/* Scrollable language grid — bounded so the modal never overruns the screen */}
        <div className="flex-1 min-h-0 overflow-y-auto px-6 pb-2">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {list.map((l) => {
              const active = l.code === currentBase
              return (
                <button
                  key={l.code}
                  onClick={() => onSelect(l.code)}
                  dir={l.rtl ? 'rtl' : undefined}
                  className={`px-3 py-2.5 rounded-xl text-sm font-medium transition-colors border ${
                    active
                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-[0_0_12px_rgba(6,182,212,0.25)]'
                      : 'bg-gray-900 text-gray-300 border-gray-700 hover:border-cyan-500/30 hover:text-white'
                  }`}
                >
                  {l.name}
                </button>
              )
            })}
            {list.length === 0 && <p className="col-span-full text-center text-xs text-gray-500 py-4">No language matches “{q}”.</p>}
          </div>
        </div>

        {/* Footer escape — always lets the visitor through */}
        <div className="px-6 py-3 border-t border-white/10 flex-shrink-0">
          <button
            onClick={() => onSelect(currentBase)}
            className="w-full py-2.5 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 text-sm font-medium hover:bg-cyan-500/25 transition-colors"
          >
            Continue{currentName && currentBase !== 'en' ? ` in ${currentName}` : ''} →
          </button>
        </div>
      </div>
    </div>
  )
}
