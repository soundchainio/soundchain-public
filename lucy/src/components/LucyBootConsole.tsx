/**
 * LucyBootConsole — a transparent, Ubuntu-startup-style install log for the
 * on-device model download.
 *
 * Frank's directive (Jun 6, 2026): "you know how ubuntu loads up on startup
 * showing the downloading of code files etc, should we show ours? show this
 * isnt a dev rug pull nor token rug pull ever!" — so instead of an opaque
 * spinner, we stream the REAL WebLLM fetch lines (param cache [N/58], MB, %)
 * as a scrolling boot log. The user literally watches what lands on their
 * device: radical transparency = the anti-rug-pull proof. A continuous looping
 * scanline + blinking cursor keeps it alive ("the /loop" at the front of the
 * download). Pure CSS, zero deps, cross-platform; honors prefers-reduced-motion
 * (via the .lucy-scan / .lucy-cursor classes in globals.css).
 */
import { useEffect, useRef, useState } from 'react'
import { Cpu, ShieldCheck, CheckCircle2 } from 'lucide-react'

type Props = {
  progress: number   // 0..1 from WebLLM initProgressCallback
  status: string     // the live WebLLM status string for this tick
  active: boolean     // a download/load is in progress
  done?: boolean      // load finished — show the "ready" completion frame before handing off to chat
}

// Strip the volatile tail (MB / GB / % / secs / [n/m]) so we only push a NEW
// log line when the underlying STEP changes (shard [55/58] -> [56/58]), and
// otherwise update the live line in place as the MB/% tick up.
const baseOf = (s: string) =>
  s
    .replace(/[\d.]+\s*(gb|mb|kb|%|secs?|seconds?|min(?:ute)?s?)/gi, '')
    .replace(/\[\d+\/\d+\]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()

// Branded boot preamble — frames the real fetch lines that follow.
const SEED = [
  'booting lucy · on-device runtime',
  'probing gpu adapter · webgpu',
  'cache backend · indexeddb  (durable · resumable)',
  'fetching neural weights · llama-3.2-3b  (one time · yours forever)',
]

export default function LucyBootConsole({ progress, status, active, done }: Props) {
  const [lines, setLines] = useState<string[]>(SEED)
  const lastBase = useRef<string>('')
  const endRef = useRef<HTMLDivElement | null>(null)
  const logRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!status) return
    const b = baseOf(status)
    setLines((prev) => {
      const next = prev.slice()
      if (b && b !== lastBase.current) {
        // a genuinely new step — append it as a fresh boot line
        lastBase.current = b
        next.push(status)
      } else if (next.length && baseOf(next[next.length - 1]) === b) {
        // same step, ticking up — update the live tail line in place
        next[next.length - 1] = status
      } else {
        next.push(status)
      }
      return next.slice(-80)
    })
  }, [status])

  useEffect(() => {
    // Pin the log to its newest line by scrolling THIS box only. scrollIntoView
    // bubbles to every scroll ancestor — on mobile it yanked the whole page
    // (Frank's "kept bouncing back to the top" mid-download). scrollTop is
    // contained to the h-44 log and never touches the page scroll.
    const el = logRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [lines, active, done])

  const pct = Math.max(0, Math.min(100, Math.round((progress || 0) * 100)))

  return (
    <div className={`rounded-lg border bg-black/85 overflow-hidden font-mono text-[10px] shadow-[0_0_24px_-8px] ${done ? 'border-emerald-400/50 shadow-emerald-400/40 lucy-boot-done' : 'border-lucy-accent/30 shadow-lucy-accent/40'}`}>
      {/* header — traffic lights + title + looping scanline ("the loop") */}
      <div className={`relative flex items-center gap-2 px-3 py-1.5 border-b ${done ? 'border-emerald-400/20 bg-emerald-400/5' : 'border-lucy-accent/20 bg-lucy-accent/5'}`}>
        <span className="flex gap-1">
          <span className="w-2 h-2 rounded-full bg-red-500/70" />
          <span className="w-2 h-2 rounded-full bg-yellow-500/70" />
          <span className="w-2 h-2 rounded-full bg-green-500/70" />
        </span>
        <span className={`flex items-center gap-1.5 uppercase tracking-[0.18em] ${done ? 'text-emerald-300' : 'text-lucy-accent'}`}>
          {done ? <><CheckCircle2 className="w-3 h-3" /> lucy · on-device · ready</> : <><Cpu className="w-3 h-3" /> lucy · on-device boot</>}
        </span>
        <span className={`ml-auto tabular-nums ${done ? 'text-emerald-300/90' : 'text-lucy-accent/80'}`}>{pct}%</span>
        {active && (
          <span className="lucy-scan pointer-events-none absolute left-0 bottom-0 h-px w-1/3 bg-gradient-to-r from-transparent via-lucy-accent to-transparent" />
        )}
      </div>

      {/* scrolling boot log — the REAL fetch lines */}
      <div ref={logRef} className="px-3 py-2 h-44 overflow-y-auto overscroll-contain leading-relaxed text-lucy-accent/90 space-y-0.5">
        {lines.map((l, i) => (
          <div key={i} className="flex gap-1.5 whitespace-pre-wrap break-all">
            <span className="select-none text-lucy-accent/40">▸</span>
            <span>{l}</span>
          </div>
        ))}
        {active && (
          <div className="flex gap-1.5 text-lucy-accent">
            <span className="select-none text-lucy-accent/40">▸</span>
            <span className="lucy-cursor">▋</span>
          </div>
        )}
        {done && (
          <div className="flex items-center gap-1.5 pt-0.5 text-emerald-300">
            <span className="select-none text-emerald-400/60">▸</span>
            <span>✅ lucy is on your device · runs offline · 0 servers</span>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* progress bar + anti-rug-pull trust footer */}
      <div className="px-3 pb-2.5 pt-1.5 space-y-2 border-t border-lucy-accent/10">
        <div className="h-1.5 w-full rounded overflow-hidden bg-lucy-bg">
          <div
            className="h-full bg-gradient-to-r from-lucy-accent to-lucy-glow transition-all duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="flex items-start gap-1.5 text-[9px] text-gray-400 leading-relaxed">
          <ShieldCheck className="w-3 h-3 mt-px shrink-0 text-lucy-accent/80" />
          <span>
            open · verifiable · <span className="text-lucy-accent/90">yours</span> — you're watching exactly what lands on your device.
            no telemetry, no server copy, <span className="text-lucy-glow/90">no rug pull, ever</span>.
            resumes if interrupted, so keep this screen open. sovereign AI on sentient fibre. 🤖
          </span>
        </p>
      </div>
    </div>
  )
}
