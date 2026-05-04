/**
 * GameChat — per-game social panel inside GameDetailModal.
 *
 * Phase 1: text + image messages, pseudonymous handles, 5s polling.
 * The "Discord for sports" surface — fans tap a game pill, see box score,
 * and now can leave comments + image takes that scope to that exact matchup.
 *
 * Phase 2 (next ship): video/reel attachments, reactions, threading,
 * SoundChain-authed verified handles. WebSocket real-time when scale warrants.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ImagePlus, Loader2, Send, Sparkles, X } from 'lucide-react'
import {
  CHAT_BODY_MAX,
  CHAT_POLL_INTERVAL_MS,
  fetchChatMessages,
  formatChatTime,
  postChatMessage,
  uploadChatImage,
  type ChatMessage,
} from '@/lib/chat'
import { ARENA_AVATARS, getIdentity, setAvatar, setHandle, type ArenaAvatar } from '@/lib/identity'
import type { SportKey } from '@/lib/espn'

interface Props {
  gameId: string
  sport: SportKey
  awayLabel?: string
  homeLabel?: string
}

export function GameChat({ gameId, sport, awayLabel, homeLabel }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [identity, setIdentity] = useState(() => getIdentity())
  const [showHandlePicker, setShowHandlePicker] = useState(false)
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)
  const [pendingImage, setPendingImage] = useState<{ file: File; preview: string } | null>(null)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  // Initial load + 5s polling (paused when tab hidden — saves battery on mobile).
  useEffect(() => {
    let cancelled = false
    let timeoutId: ReturnType<typeof setTimeout> | null = null

    const load = async () => {
      try {
        const r = await fetchChatMessages({ gameId, sport })
        if (cancelled) return
        // Server returns newest-first; reverse for chronological-up rendering.
        setMessages(r.messages.slice().reverse())
        setLoaded(true)
        setError(null)
      } catch (e: unknown) {
        if (cancelled) return
        setError((e as Error)?.message ?? 'Chat unavailable')
        setLoaded(true)
      } finally {
        if (cancelled) return
        if (document.visibilityState === 'visible') {
          timeoutId = setTimeout(load, CHAT_POLL_INTERVAL_MS)
        }
      }
    }

    load()
    const onVisible = () => {
      if (document.visibilityState === 'visible' && !timeoutId && !cancelled) {
        load()
      }
    }
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      cancelled = true
      if (timeoutId) clearTimeout(timeoutId)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [gameId, sport])

  const matchupLabel = useMemo(() => {
    if (awayLabel && homeLabel) return `${awayLabel} @ ${homeLabel}`
    return 'this game'
  }, [awayLabel, homeLabel])

  const refreshIdentity = useCallback(() => setIdentity(getIdentity()), [])

  const handleSend = async () => {
    setSendError(null)
    const trimmed = body.trim()
    if (!trimmed && !pendingImage) {
      setSendError('Say something or attach an image')
      return
    }
    if (!identity.handle) {
      setShowHandlePicker(true)
      return
    }

    setSending(true)
    try {
      let mediaUrl: string | null = null
      if (pendingImage) {
        setUploading(true)
        try {
          const uploaded = await uploadChatImage({ gameId, sport, file: pendingImage.file })
          mediaUrl = uploaded.mediaUrl
        } finally {
          setUploading(false)
        }
      }
      const msg = await postChatMessage({ gameId, sport, body: trimmed, mediaUrl })
      setMessages((prev) => [...prev, msg])
      setBody('')
      clearPendingImage()
    } catch (e: unknown) {
      setSendError((e as Error)?.message ?? 'Send failed')
    } finally {
      setSending(false)
    }
  }

  const onPickImage = (file: File | null) => {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setSendError('Pick an image file')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setSendError('Image must be 5 MB or smaller')
      return
    }
    if (pendingImage) URL.revokeObjectURL(pendingImage.preview)
    setPendingImage({ file, preview: URL.createObjectURL(file) })
    setSendError(null)
  }

  const clearPendingImage = () => {
    if (pendingImage) URL.revokeObjectURL(pendingImage.preview)
    setPendingImage(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  const charCount = body.length
  const charClass = charCount > CHAT_BODY_MAX
    ? 'text-arena-red'
    : charCount > CHAT_BODY_MAX - 30
      ? 'text-arena-orange'
      : 'text-arena-muted-l dark:text-arena-muted-d'

  return (
    <div className="rounded-xl border border-arena-border-l dark:border-arena-border-d bg-arena-card dark:bg-arena-surface overflow-hidden">
      {/* Identity row */}
      <div className="px-3 py-2 flex items-center justify-between gap-2 border-b border-arena-border-l dark:border-arena-border-d bg-arena-paper/60 dark:bg-arena-carbon/60">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xl leading-none flex-shrink-0">{identity.avatar}</span>
          <div className="min-w-0">
            <div className="text-[11px] font-black uppercase tracking-wider truncate">
              {identity.handle ? `@${identity.handle}` : 'Pick a handle to chat'}
            </div>
            <div className="text-[10px] text-arena-muted-l dark:text-arena-muted-d truncate">
              {identity.handle ? 'Free-to-play · device-pseudonymous' : `Talk about ${matchupLabel}`}
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setShowHandlePicker(true)}
          className="flex-shrink-0 text-[10px] font-black uppercase tracking-wider px-2.5 py-1.5 rounded-full bg-arena-card dark:bg-arena-surface border border-arena-border-l dark:border-arena-border-d hover:border-arena-red hover:text-arena-red transition"
        >
          {identity.handle ? 'Edit' : 'Set up'}
        </button>
      </div>

      {/* Messages list */}
      <div className="max-h-[420px] overflow-y-auto px-3 py-3 space-y-2">
        {!loaded && (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-12 rounded-lg bg-arena-paper/60 dark:bg-arena-carbon/60 animate-pulse" />
            ))}
          </div>
        )}

        {loaded && error && (
          <div className="text-center text-[11px] text-arena-muted-l dark:text-arena-muted-d py-6">
            {error}
          </div>
        )}

        {loaded && !error && messages.length === 0 && (
          <div className="text-center py-6 space-y-1">
            <Sparkles className="w-5 h-5 mx-auto text-arena-orange" />
            <div className="text-xs font-black">Be the first to chat about {matchupLabel}.</div>
            <div className="text-[10px] text-arena-muted-l dark:text-arena-muted-d">
              Reactions, predictions, hot takes — keep it free-to-play.
            </div>
          </div>
        )}

        {loaded && messages.map((m) => (
          <ChatBubble key={m.id} msg={m} />
        ))}
      </div>

      {/* Composer */}
      <div className="border-t border-arena-border-l dark:border-arena-border-d px-3 pt-2 pb-3 bg-arena-paper/60 dark:bg-arena-carbon/60">
        {pendingImage && (
          <div className="mb-2 relative inline-block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={pendingImage.preview} alt="upload preview" className="max-h-24 rounded-lg border border-arena-border-l dark:border-arena-border-d" />
            <button
              type="button"
              onClick={clearPendingImage}
              className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-arena-red text-white flex items-center justify-center hover:bg-red-700 transition"
              aria-label="Remove image"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}

        <div className="flex items-end gap-2">
          <textarea
            value={body}
            onChange={(e) => {
              setBody(e.target.value)
              setSendError(null)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && !e.metaKey) {
                e.preventDefault()
                handleSend()
              }
            }}
            placeholder={identity.handle ? 'Drop a take…' : 'Set a handle, then drop a take…'}
            rows={1}
            maxLength={CHAT_BODY_MAX + 50}
            disabled={sending}
            className="flex-1 resize-none rounded-lg bg-arena-card dark:bg-arena-surface border border-arena-border-l dark:border-arena-border-d px-3 py-2 text-sm focus:outline-none focus:border-arena-red transition disabled:opacity-50"
          />
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={(e) => onPickImage(e.target.files?.[0] ?? null)}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={sending || uploading}
            className="flex-shrink-0 w-9 h-9 rounded-lg bg-arena-card dark:bg-arena-surface border border-arena-border-l dark:border-arena-border-d flex items-center justify-center hover:border-arena-red hover:text-arena-red transition disabled:opacity-50"
            aria-label="Attach image"
          >
            <ImagePlus className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleSend}
            disabled={sending || uploading || (!body.trim() && !pendingImage) || charCount > CHAT_BODY_MAX}
            className="flex-shrink-0 w-9 h-9 rounded-lg bg-arena-red text-white flex items-center justify-center hover:bg-red-700 transition disabled:opacity-40"
            aria-label="Send"
          >
            {sending || uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>

        <div className="mt-1.5 flex items-center justify-between text-[10px]">
          <span className={sendError ? 'text-arena-red font-bold' : 'text-arena-muted-l dark:text-arena-muted-d'}>
            {sendError ?? (uploading ? 'Pinning image to IPFS…' : 'Enter to send · Shift+Enter for newline')}
          </span>
          <span className={`font-mono ${charClass}`}>{charCount}/{CHAT_BODY_MAX}</span>
        </div>
      </div>

      {showHandlePicker && (
        <HandlePickerModal
          initialHandle={identity.handle ?? ''}
          initialAvatar={identity.avatar}
          onClose={() => setShowHandlePicker(false)}
          onSave={() => {
            refreshIdentity()
            setShowHandlePicker(false)
          }}
        />
      )}
    </div>
  )
}

function ChatBubble({ msg }: { msg: ChatMessage }) {
  return (
    <div className={`flex gap-2 ${msg.isMine ? 'flex-row-reverse' : ''}`}>
      <div className="flex-shrink-0 w-7 h-7 rounded-full bg-arena-paper dark:bg-arena-carbon border border-arena-border-l dark:border-arena-border-d flex items-center justify-center text-base leading-none">
        {msg.avatar}
      </div>
      <div className={`flex-1 min-w-0 max-w-[80%] ${msg.isMine ? 'items-end' : ''}`}>
        <div className={`flex items-baseline gap-1.5 text-[10px] mb-0.5 ${msg.isMine ? 'justify-end' : ''}`}>
          <span className="font-black text-arena-red">@{msg.handle}</span>
          <span className="text-arena-muted-l dark:text-arena-muted-d font-mono">{formatChatTime(msg.createdAt)}</span>
        </div>
        <div
          className={`inline-block max-w-full rounded-2xl px-3 py-2 text-sm break-words ${
            msg.isMine
              ? 'bg-arena-red text-white rounded-tr-sm'
              : 'bg-arena-paper dark:bg-arena-carbon border border-arena-border-l dark:border-arena-border-d rounded-tl-sm'
          }`}
        >
          {msg.body && <p className="whitespace-pre-wrap leading-relaxed">{msg.body}</p>}
          {msg.mediaUrl && msg.mediaType === 'image' && (
            <a href={msg.mediaUrl} target="_blank" rel="noreferrer" className="block mt-1.5 -mx-1">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={msg.mediaUrl}
                alt="chat attachment"
                loading="lazy"
                className="max-h-64 w-auto rounded-lg"
              />
            </a>
          )}
        </div>
      </div>
    </div>
  )
}

function HandlePickerModal({
  initialHandle,
  initialAvatar,
  onClose,
  onSave,
}: {
  initialHandle: string
  initialAvatar: ArenaAvatar
  onClose: () => void
  onSave: () => void
}) {
  const [handle, setHandleInput] = useState(initialHandle)
  const [avatar, setAvatarInput] = useState<ArenaAvatar>(initialAvatar)
  const [error, setError] = useState<string | null>(null)

  const save = () => {
    const result = setHandle(handle)
    if (!result.ok) {
      setError(result.error)
      return
    }
    setAvatar(avatar)
    onSave()
  }

  return (
    <div
      className="fixed inset-0 z-[180] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-sm bg-arena-paper dark:bg-arena-carbon border border-arena-border-l dark:border-arena-border-d rounded-2xl shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="px-4 py-3 border-b border-arena-border-l dark:border-arena-border-d flex items-center justify-between">
          <h3 className="text-sm font-black uppercase tracking-wider">Set your handle</h3>
          <button onClick={onClose} className="w-7 h-7 rounded-full border border-arena-border-l dark:border-arena-border-d flex items-center justify-center hover:border-arena-red hover:text-arena-red transition" aria-label="Close">
            <X className="w-3.5 h-3.5" />
          </button>
        </header>
        <div className="p-4 space-y-4">
          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-arena-muted-l dark:text-arena-muted-d mb-1.5">
              Display name
            </label>
            <input
              type="text"
              value={handle}
              onChange={(e) => {
                setHandleInput(e.target.value)
                setError(null)
              }}
              maxLength={24}
              autoFocus
              placeholder="e.g. courtside_kid"
              className="w-full rounded-lg bg-arena-card dark:bg-arena-surface border border-arena-border-l dark:border-arena-border-d px-3 py-2 text-sm focus:outline-none focus:border-arena-red"
            />
            <p className="mt-1 text-[10px] text-arena-muted-l dark:text-arena-muted-d">
              2-24 chars · letters, numbers, dot, dash, underscore. Stored on this device only.
            </p>
          </div>
          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-arena-muted-l dark:text-arena-muted-d mb-1.5">
              Avatar
            </label>
            <div className="grid grid-cols-10 gap-1">
              {ARENA_AVATARS.map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => setAvatarInput(a)}
                  className={`aspect-square rounded-lg flex items-center justify-center text-xl transition ${
                    avatar === a
                      ? 'bg-arena-red ring-2 ring-arena-red'
                      : 'bg-arena-card dark:bg-arena-surface border border-arena-border-l dark:border-arena-border-d hover:border-arena-red'
                  }`}
                >
                  {a}
                </button>
              ))}
            </div>
          </div>
          {error && <p className="text-[11px] text-arena-red font-bold">{error}</p>}
          <button
            type="button"
            onClick={save}
            className="w-full rounded-lg bg-arena-red text-white font-black uppercase tracking-wider py-2.5 text-sm hover:bg-red-700 transition"
          >
            Save handle
          </button>
          <p className="text-[10px] text-arena-muted-l dark:text-arena-muted-d text-center">
            Phase 2: link your SoundChain account for a verified checkmark.
          </p>
        </div>
      </div>
    </div>
  )
}
