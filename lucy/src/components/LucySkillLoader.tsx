/**
 * LucySkillLoader — transparent, step-by-step loader for adding a skill.md (or,
 * later, an OpenClaw plugin) from a URL. Same radical-transparency principle as
 * LucyBootConsole: the user WATCHES each real step land — fetch → parse →
 * sanitize → encrypt+store — instead of an opaque spinner. Frank (Jun 7): "add
 * a skill.md uploader viewing so the user sees the loading bar and the files
 * its loading." Reusable for any multi-step on-device ingest.
 *
 * Pure CSS animation (Tailwind animate-spin + the .lucy-boot-done glow in
 * globals.css); zero deps.
 */
import { CheckCircle2, Loader2, XCircle, Sparkles } from 'lucide-react'

export type LoaderStep = { label: string; status: 'pending' | 'active' | 'done' | 'error' }
export type SkillLoadState = {
  title: string
  subtitle?: string
  steps: LoaderStep[]
  done?: boolean
  error?: string
}

export default function LucySkillLoader({ state }: { state: SkillLoadState | null }) {
  if (!state) return null
  const total = state.steps.length || 1
  const completed = state.steps.filter((s) => s.status === 'done').length
  const pct = Math.round((completed / total) * 100)
  const err = !!state.error

  const tone = err
    ? 'border-red-400/50 shadow-red-400/30'
    : state.done
      ? 'border-emerald-400/50 shadow-emerald-400/40 lucy-boot-done'
      : 'border-lucy-accent/30 shadow-lucy-accent/40'
  const headTone = err ? 'text-red-300' : state.done ? 'text-emerald-300' : 'text-lucy-accent'

  return (
    <div className={`rounded-lg border bg-black/85 overflow-hidden font-mono text-[10px] shadow-[0_0_24px_-8px] ${tone}`}>
      <div className={`flex items-center gap-2 px-3 py-1.5 border-b ${err ? 'border-red-400/20 bg-red-400/5' : state.done ? 'border-emerald-400/20 bg-emerald-400/5' : 'border-lucy-accent/20 bg-lucy-accent/5'}`}>
        <Sparkles className={`w-3 h-3 ${headTone}`} />
        <span className={`uppercase tracking-[0.18em] ${headTone}`}>{state.title}</span>
        <span className="ml-auto tabular-nums text-gray-500">{err ? '!' : `${pct}%`}</span>
      </div>

      <div className="px-3 py-2 space-y-1">
        {state.subtitle && <div className="text-[9px] text-gray-500 break-all pb-0.5">▸ {state.subtitle}</div>}
        {state.steps.map((s, i) => (
          <div key={i} className="flex items-center gap-1.5">
            {s.status === 'done' ? (
              <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
            ) : s.status === 'active' ? (
              <Loader2 className="w-3 h-3 text-lucy-accent shrink-0 animate-spin" />
            ) : s.status === 'error' ? (
              <XCircle className="w-3 h-3 text-red-400 shrink-0" />
            ) : (
              <span className="w-3 h-3 shrink-0 flex items-center justify-center text-gray-600">▢</span>
            )}
            <span
              className={
                s.status === 'done'
                  ? 'text-emerald-300/80'
                  : s.status === 'active'
                    ? 'text-lucy-accent'
                    : s.status === 'error'
                      ? 'text-red-300'
                      : 'text-gray-600'
              }
            >
              {s.label}
            </span>
          </div>
        ))}
        {state.error && <div className="text-[9px] text-red-400/80 pt-0.5">{state.error}</div>}
      </div>

      <div className="px-3 pb-2">
        <div className="h-1 w-full rounded overflow-hidden bg-lucy-bg">
          <div
            className={`h-full transition-all duration-300 ${err ? 'bg-red-400' : 'bg-gradient-to-r from-lucy-accent to-lucy-glow'}`}
            style={{ width: `${err ? 100 : pct}%` }}
          />
        </div>
      </div>
    </div>
  )
}
