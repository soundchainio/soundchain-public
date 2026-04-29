/**
 * FrameOverrideIndicator — bottom-right pill that surfaces an active display-mode override.
 *
 * Why: a venue user pins "Projector" on a phone-into-projection-room setup, then a different
 * person picks the device up later. Without this pill the override is silently sticky and
 * the next page they hit looks bizarre (huge type, ultrawide max-w on a phone). The pill
 * makes the override visible and one-tap reversible.
 *
 * Mounts in _app.tsx alongside DisplayModeInit. Renders nothing when override === 'auto'.
 */
import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import {
  DisplayModeOverride,
  DISPLAY_MODE_OVERRIDE_EVENT,
  clearOverride,
  getOverride,
  labelForOverride,
} from 'lib/tvMode'

export const FrameOverrideIndicator = () => {
  const [override, setOverride] = useState<DisplayModeOverride>('auto')
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    const sync = () => {
      const v = getOverride() || 'auto'
      setOverride(v)
      if (v === 'auto') setDismissed(false) // auto resets dismissal
    }
    sync()
    window.addEventListener(DISPLAY_MODE_OVERRIDE_EVENT, sync)
    return () => window.removeEventListener(DISPLAY_MODE_OVERRIDE_EVENT, sync)
  }, [])

  if (override === 'auto' || dismissed) return null

  return (
    <div
      className="fixed bottom-3 right-3 z-[9998] flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/85 backdrop-blur border border-cyan-500/40 shadow-[0_0_18px_rgba(6,182,212,0.35)] text-[10px] font-mono uppercase tracking-widest"
      role="status"
    >
      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
      <span className="text-cyan-300">Frame:</span>
      <span className="text-white font-bold">{labelForOverride(override)}</span>
      <button
        onClick={() => clearOverride()}
        className="ml-1 px-2 py-0.5 rounded-full bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-200 border border-cyan-400/40 transition"
        aria-label="Reset frame to auto-detect"
      >
        Reset
      </button>
      <button
        onClick={() => setDismissed(true)}
        className="text-gray-400 hover:text-white transition"
        aria-label="Hide indicator"
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  )
}
