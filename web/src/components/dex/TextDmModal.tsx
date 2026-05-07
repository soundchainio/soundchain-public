import { useState, useEffect, useRef } from 'react'
import { MessageSquare, X, Send } from 'lucide-react'

interface TextDmModalProps {
  open: boolean
  onClose: () => void
  recipient: {
    profileId: string
    displayName: string
    handle: string
    avatar?: string | null
  }
}

// Slim compose modal — opens from the Text pill on profile pages. Sends via
// /api/dm/send-text which fans out to in-app + Web Push + Nostr in parallel.
// On native (Capacitor) the recipient gets a real lock-screen banner that
// reads exactly like an SMS; on web they get a system push notification.
export const TextDmModal = ({ open, onClose, recipient }: TextDmModalProps) => {
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sentAt, setSentAt] = useState<Date | null>(null)
  const taRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (open) {
      setBody('')
      setError(null)
      setSentAt(null)
      requestAnimationFrame(() => taRef.current?.focus())
    }
  }, [open])

  if (!open) return null

  const charCount = body.length
  const overLimit = charCount > 4000

  const handleSend = async () => {
    if (!body.trim() || sending || overLimit) return
    setSending(true)
    setError(null)
    try {
      const res = await fetch('/api/dm/send-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ toProfileId: recipient.profileId, body: body.trim() }),
      })
      const json = await res.json()
      if (!res.ok || !json.ok) {
        setError(json.error || `Send failed (${res.status})`)
        setSending(false)
        return
      }
      setSentAt(new Date())
      setBody('')
      setSending(false)
      // Close after a brief success flash so the user sees confirmation.
      setTimeout(onClose, 900)
    } catch (e: any) {
      setError(e?.message || 'Network error')
      setSending(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="w-full sm:w-[440px] sm:max-w-[92vw] sm:rounded-xl bg-neutral-950 border border-cyan-500/30 shadow-xl shadow-cyan-500/10 rounded-t-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b border-white/5">
          <div className="flex items-center gap-2.5 min-w-0">
            {recipient.avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={recipient.avatar} alt="" className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
            ) : (
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-cyan-500 to-purple-600 flex-shrink-0" />
            )}
            <div className="min-w-0">
              <div className="text-[11px] uppercase tracking-wider text-cyan-300 flex items-center gap-1">
                <MessageSquare className="w-3 h-3" />
                Text
              </div>
              <div className="text-sm text-white font-semibold truncate">
                {recipient.displayName || recipient.handle || 'User'}
              </div>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white p-1" aria-label="Close">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Compose */}
        <div className="p-3">
          <textarea
            ref={taRef}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Message ${recipient.handle ? '@' + recipient.handle : ''}…`}
            rows={4}
            disabled={sending || !!sentAt}
            className="w-full resize-none bg-black/40 border border-white/10 focus:border-cyan-400/50 rounded-lg p-3 text-sm text-white placeholder-gray-500 focus:outline-none disabled:opacity-50"
          />
          <div className="flex items-center justify-between mt-1.5">
            <span className={`text-[10px] ${overLimit ? 'text-red-400' : 'text-gray-500'}`}>
              {charCount}/4000
            </span>
            <span className="text-[9px] text-gray-600">
              ⌘ + Enter to send
            </span>
          </div>

          {error && (
            <div className="mt-2 px-2.5 py-1.5 rounded-md bg-red-500/15 border border-red-500/40 text-[11px] text-red-300">
              {error}
            </div>
          )}

          {sentAt && (
            <div className="mt-2 px-2.5 py-1.5 rounded-md bg-emerald-500/15 border border-emerald-500/40 text-[11px] text-emerald-300">
              Sent · they’ll see it as a notification on every device they’ve opted in.
            </div>
          )}

          <button
            onClick={handleSend}
            disabled={!body.trim() || sending || overLimit || !!sentAt}
            className={`w-full mt-2.5 py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
              body.trim() && !sending && !overLimit && !sentAt
                ? 'bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 text-white shadow-md shadow-cyan-500/20'
                : 'bg-gray-700 text-gray-400 cursor-not-allowed'
            }`}
          >
            {sending ? (
              <>
                <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                Sending…
              </>
            ) : sentAt ? (
              'Sent ✓'
            ) : (
              <>
                <Send className="w-4 h-4" />
                Send
              </>
            )}
          </button>

          <p className="mt-2 text-[9px] text-gray-600 text-center leading-snug">
            Encrypted via Nostr · web push enabled · zero per-message fees
          </p>
        </div>
      </div>
    </div>
  )
}
