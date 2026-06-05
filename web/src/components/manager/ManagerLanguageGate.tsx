import { Globe } from 'lucide-react'
import { MANAGER_LOCALES, baseLang } from 'lib/managerI18n'

// ─── Language welcome gate ────────────────────────────────────────────────────
// The first thing a visitor sees on a pro's manager page: pick your language.
// Once chosen, the agent communicates entirely in it — typed AND spoken — and
// the choice is remembered (parent persists it) so returning visitors skip this.
// The auto-detected language is pre-highlighted.

interface Props {
  current: string
  onSelect: (code: string) => void
}

export function ManagerLanguageGate({ current, onSelect }: Props) {
  const currentBase = baseLang(current)
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
      <div className="w-full max-w-md rounded-2xl border border-cyan-500/25 bg-gradient-to-b from-[#0b0f1c] to-[#06070d] p-6 shadow-2xl">
        <div className="flex flex-col items-center text-center mb-5">
          <div className="w-12 h-12 rounded-full bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center mb-3">
            <Globe className="w-6 h-6 text-cyan-400 animate-pulse" />
          </div>
          <h2 className="text-lg font-semibold text-white">Choose your language</h2>
          <p className="text-xs text-gray-400 mt-1">The manager will speak &amp; type in your language.</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {MANAGER_LOCALES.map(l => {
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
        </div>
      </div>
    </div>
  )
}
