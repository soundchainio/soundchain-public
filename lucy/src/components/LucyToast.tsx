/**
 * LucyToast — a tiny, dependency-free toast (no react-toastify, keeps the
 * bundle lean per Frank's style). Fixed above the composer, auto-dismisses,
 * tap-to-close. Used for the on-device download completion confirmation
 * ("Lucy is now on your device") — the missing "✅ done" beat Frank flagged
 * after the boot console handed off silently to the chat.
 *
 * Animation lives in globals.css (.lucy-toast); honors prefers-reduced-motion.
 */
import { useEffect } from 'react'
import { CheckCircle2, X } from 'lucide-react'

type Props = {
  message: string | null
  onDismiss: () => void
  duration?: number   // ms before auto-dismiss
}

export default function LucyToast({ message, onDismiss, duration = 7000 }: Props) {
  useEffect(() => {
    if (!message) return
    const t = setTimeout(onDismiss, duration)
    return () => clearTimeout(t)
  }, [message, duration, onDismiss])

  if (!message) return null

  return (
    <div className="fixed inset-x-0 bottom-24 z-50 flex justify-center px-4 pointer-events-none">
      <div
        role="status"
        aria-live="polite"
        className="lucy-toast pointer-events-auto flex items-start gap-2 max-w-sm rounded-lg border border-lucy-accent/40 bg-black/90 px-3.5 py-2.5 backdrop-blur-md shadow-[0_0_28px_-8px] shadow-lucy-accent/50"
      >
        <CheckCircle2 className="w-4 h-4 mt-px shrink-0 text-lucy-accent" />
        <span className="text-[11px] leading-relaxed text-gray-100 whitespace-pre-wrap break-words">
          {message}
        </span>
        <button
          onClick={onDismiss}
          aria-label="Dismiss"
          className="ml-1 -mr-1 -mt-0.5 p-1 rounded text-gray-500 hover:text-white shrink-0"
        >
          <X className="w-3 h-3" />
        </button>
      </div>
    </div>
  )
}
