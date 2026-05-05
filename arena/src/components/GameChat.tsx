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
import { Check, Film, ImagePlus, Loader2, Pencil, Search, Send, Smile, Sparkles, Trash2, Upload, X } from 'lucide-react'
import {
  CHAT_BODY_MAX,
  CHAT_POLL_INTERVAL_MS,
  deleteChatMessage,
  editChatMessage,
  fetchChatMessages,
  formatChatTime,
  postChatMessage,
  uploadChatImage,
  type ChatMessage,
  type ChatReaction,
} from '@/lib/chat'
import { ARENA_AVATARS, getIdentity, isUrlAvatar, setAvatar, setHandle, type Avatar, type ArenaAvatar } from '@/lib/identity'
import { PREFETCHED_EMOTES, SC_EMOTES, TWITCH_EMOTES, searchSevenTv, type ArenaEmote } from '@/lib/emotes'
import type { SportKey } from '@/lib/espn'
import { ChatActions } from './ChatActions'
import { ParsedBody } from './ParsedBody'
import { NotificationBell } from './NotificationBell'
import { ReactionPicker } from './ReactionPicker'
import { GifPicker } from './GifPicker'
import { IdentityModal } from './IdentityModal'

// Render either an emoji avatar (string) or a Pinata-pinned URL as a circle image.
// Used in three places: identity row, chat bubbles, picker preview.
function AvatarSlot({ avatar, size = 'md' }: { avatar: string; size?: 'sm' | 'md' | 'lg' }) {
  const dim = size === 'lg' ? 'w-12 h-12' : size === 'sm' ? 'w-7 h-7' : 'w-7 h-7'
  const text = size === 'lg' ? 'text-3xl' : 'text-base'
  if (isUrlAvatar(avatar)) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatar}
        alt="avatar"
        className={`${dim} rounded-full object-cover border border-arena-border-l dark:border-arena-border-d flex-shrink-0`}
        loading="lazy"
      />
    )
  }
  return (
    <span className={`${dim} ${text} leading-none flex items-center justify-center flex-shrink-0`}>
      {avatar}
    </span>
  )
}

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
  const [showIdentityModal, setShowIdentityModal] = useState(false)
  // Phase 2: native-first auth (Apple/Google/Guest). Provider availability is
  // server-driven — env vars not provisioned = pill renders disabled. Continue
  // as Guest always works (today's deviceId-pseudonymous flow).
  const [providers, setProviders] = useState<{ apple: boolean; google: boolean; passkey: boolean; sessionReady: boolean }>({
    apple: false,
    google: false,
    passkey: false,
    sessionReady: false,
  })
  const [authed, setAuthed] = useState(false)
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)
  const [pendingImage, setPendingImage] = useState<{ file: File; preview: string } | null>(null)
  const [uploading, setUploading] = useState(false)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [showGifPicker, setShowGifPicker] = useState(false)
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

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

  // On mount: hydrate provider config + restore auth session (if any). When
  // signed in via Apple/Google the server returns the persisted handle/avatar;
  // we mirror those into localStorage so the rest of GameChat (which reads
  // identity from localStorage today) sees the cross-device-persistent value
  // without rewiring the chat plumbing. Survives history wipes — only cookies
  // wipe matters here, and we re-fetch on every mount anyway.
  useEffect(() => {
    let cancelled = false
    fetch('/api/auth/me', { credentials: 'include' })
      .then((r) => r.json())
      .then((data: {
        authed?: boolean
        provider?: 'apple' | 'google' | 'passkey' | 'guest'
        handle?: string | null
        avatar?: string | null
        providers?: { apple: boolean; google: boolean; passkey: boolean; sessionReady: boolean }
      }) => {
        if (cancelled) return
        if (data.providers) setProviders(data.providers)
        if (data.authed) {
          setAuthed(true)
          if (data.handle) {
            const r = setHandle(data.handle)
            if (r.ok) {
              if (data.avatar) setAvatar(data.avatar as Avatar)
              refreshIdentity()
            }
          }
        }
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [refreshIdentity])

  // Native-first identity gate. When the user has no handle yet, route them
  // through IdentityModal first (Apple / Google / Continue as Guest). Already
  // signed-in users with no handle (first-time on a fresh provider account)
  // skip straight to HandlePicker since identity is established.
  const openIdentityGate = useCallback(() => {
    if (identity.handle) return false
    if (authed) {
      setShowHandlePicker(true)
    } else {
      setShowIdentityModal(true)
    }
    return true
  }, [identity.handle, authed])

  const handleSend = async () => {
    setSendError(null)
    const trimmed = body.trim()
    if (!trimmed && !pendingImage) {
      setSendError('Say something or attach an image')
      return
    }
    if (openIdentityGate()) return

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
      const msg = await postChatMessage({
        gameId,
        sport,
        body: trimmed,
        mediaUrl,
        replyTo: replyingTo?.id ?? null,
      })
      setMessages((prev) => [...prev, msg])
      setBody('')
      clearPendingImage()
      setReplyingTo(null)
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

  // Composer emoji picker. Unicode emoji insert at cursor position so the
  // user can keep typing or hit send. Image emotes (7TV/BTTV/FFZ/Twitch)
  // post immediately as standalone "sticker" takes — same flow SC's wall
  // and feed use for one-tap emote drops.
  const handleEmojiPick = async (args: { key: string; kind: 'emoji' | 'image' }) => {
    setSendError(null)
    if (args.kind === 'emoji') {
      const ta = textareaRef.current
      if (ta) {
        const start = ta.selectionStart ?? body.length
        const end = ta.selectionEnd ?? body.length
        const next = body.slice(0, start) + args.key + body.slice(end)
        setBody(next)
        // Restore cursor just after the inserted emoji on the next paint.
        requestAnimationFrame(() => {
          ta.focus()
          const pos = start + args.key.length
          ta.setSelectionRange(pos, pos)
        })
      } else {
        setBody((prev) => prev + args.key)
      }
      return
    }
    // Image emote → fire as a standalone sticker take.
    if (openIdentityGate()) return
    setSending(true)
    try {
      const msg = await postChatMessage({
        gameId,
        sport,
        body: '',
        mediaUrl: args.key,
        replyTo: replyingTo?.id ?? null,
      })
      setMessages((prev) => [...prev, msg])
      setReplyingTo(null)
    } catch (e: unknown) {
      setSendError((e as Error)?.message ?? 'Send failed')
    } finally {
      setSending(false)
    }
  }

  // Composer GIF picker. Mirrors the SC wall + feed + comments flow: tap the
  // film pill, search GIPHY, pick a GIF — posts as a standalone sticker take
  // via the standard chat POST (mediaUrl + mediaType:'image'). Threads if
  // replyingTo is set, same as text + emote-sticker sends. Server-side
  // MEDIA_URL_ALLOW gates `media[0-4].giphy.com` + `i.giphy.com` hosts.
  const handleGifPick = async (gifUrl: string) => {
    setSendError(null)
    if (openIdentityGate()) return
    setSending(true)
    try {
      const msg = await postChatMessage({
        gameId,
        sport,
        body: '',
        mediaUrl: gifUrl,
        replyTo: replyingTo?.id ?? null,
      })
      setMessages((prev) => [...prev, msg])
      setReplyingTo(null)
    } catch (e: unknown) {
      setSendError((e as Error)?.message ?? 'Send failed')
    } finally {
      setSending(false)
    }
  }

  const handleMessageEdited = (next: ChatMessage) => {
    setMessages((prev) => prev.map((p) => (p.id === next.id ? { ...p, ...next } : p)))
  }

  const handleMessageDeleted = (id: string) => {
    setMessages((prev) => prev.filter((p) => p.id !== id))
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
          <AvatarSlot avatar={identity.avatar} size="sm" />
          <div className="min-w-0">
            <div className="text-[11px] font-black uppercase tracking-wider truncate">
              {identity.handle ? `@${identity.handle}` : 'Pick a handle to chat'}
            </div>
            <div className="text-[10px] text-arena-muted-l dark:text-arena-muted-d truncate">
              {identity.handle ? 'Free-to-play · device-pseudonymous' : `Talk about ${matchupLabel}`}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <NotificationBell />
          <button
            type="button"
            onClick={() => identity.handle ? setShowHandlePicker(true) : openIdentityGate()}
            className="flex-shrink-0 text-[10px] font-black uppercase tracking-wider px-2.5 py-1.5 rounded-full bg-arena-card dark:bg-arena-surface border border-arena-border-l dark:border-arena-border-d hover:border-arena-red hover:text-arena-red transition"
          >
            {identity.handle ? 'Edit' : 'Sign in'}
          </button>
        </div>
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
          <ChatBubble
            key={m.id}
            msg={m}
            onReactionsChange={(next) => {
              setMessages((prev) =>
                prev.map((p) => (p.id === m.id ? { ...p, reactions: next.reactions, myReactions: next.myReactions } : p)),
              )
            }}
            onEdited={handleMessageEdited}
            onDeleted={handleMessageDeleted}
            onReplyClick={() => {
              setReplyingTo(m)
              setSendError(null)
              // Focus the composer so the user can start typing right away.
              requestAnimationFrame(() => textareaRef.current?.focus())
            }}
          />
        ))}
      </div>

      {/* Composer */}
      <div className="border-t border-arena-border-l dark:border-arena-border-d px-3 pt-2 pb-3 bg-arena-paper/60 dark:bg-arena-carbon/60">
        {replyingTo && (
          <div className="mb-2 flex items-start gap-2 px-2 py-1.5 rounded-lg bg-arena-card dark:bg-arena-surface border border-arena-red/40 text-[11px]">
            <div className="flex-1 min-w-0">
              <div className="font-black uppercase tracking-wider text-arena-red text-[10px]">
                ↳ Replying to @{replyingTo.handle}
              </div>
              <div className="truncate text-arena-muted-l dark:text-arena-muted-d">
                {replyingTo.body
                  ? replyingTo.body
                  : (replyingTo.mediaUrl ? '[image]' : '')}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setReplyingTo(null)}
              className="flex-shrink-0 w-5 h-5 rounded-full border border-arena-border-l dark:border-arena-border-d flex items-center justify-center hover:border-arena-red hover:text-arena-red transition"
              aria-label="Cancel reply"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}

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
            ref={textareaRef}
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
            onClick={() => identity.handle ? setShowEmojiPicker(true) : openIdentityGate()}
            disabled={sending || uploading}
            className="flex-shrink-0 w-9 h-9 rounded-lg bg-arena-card dark:bg-arena-surface border border-arena-border-l dark:border-arena-border-d flex items-center justify-center hover:border-arena-red hover:text-arena-red transition disabled:opacity-50"
            aria-label="Pick an emoji or sticker"
          >
            <Smile className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => identity.handle ? setShowGifPicker(true) : openIdentityGate()}
            disabled={sending || uploading}
            className="flex-shrink-0 w-9 h-9 rounded-lg bg-arena-card dark:bg-arena-surface border border-arena-border-l dark:border-arena-border-d flex items-center justify-center hover:border-arena-red hover:text-arena-red transition disabled:opacity-50"
            aria-label="Pick a GIF from GIPHY"
            title="GIF"
          >
            <Film className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => identity.handle ? fileRef.current?.click() : openIdentityGate()}
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

      {showEmojiPicker && (
        <ReactionPicker
          onPick={(args) => {
            handleEmojiPick(args)
          }}
          onClose={() => setShowEmojiPicker(false)}
        />
      )}

      {showGifPicker && (
        <GifPicker
          onSelect={(gifUrl) => {
            handleGifPick(gifUrl)
          }}
          onClose={() => setShowGifPicker(false)}
        />
      )}

      {showIdentityModal && (
        <IdentityModal
          providers={providers}
          onAuthSuccess={({ provider, handle, avatar }) => {
            setAuthed(true)
            if (handle) {
              const r = setHandle(handle)
              if (r.ok && avatar) setAvatar(avatar as Avatar)
              refreshIdentity()
              setShowIdentityModal(false)
            } else {
              // First-time sign-in with this provider — identity established but
              // no display handle/avatar yet. Hand off to HandlePickerModal so
              // the user can pick one. The save endpoint now keys on the auth
              // sub from the session cookie automatically.
              setShowIdentityModal(false)
              setShowHandlePicker(true)
            }
            // Mark unused param to silence linter; provider is logged for telemetry follow-up.
            void provider
          }}
          onContinueAsGuest={() => {
            setShowIdentityModal(false)
            setShowHandlePicker(true)
          }}
          onClose={() => setShowIdentityModal(false)}
        />
      )}
    </div>
  )
}

function ChatBubble({
  msg,
  onReactionsChange,
  onEdited,
  onDeleted,
  onReplyClick,
}: {
  msg: ChatMessage
  onReactionsChange: (next: { reactions: ChatReaction[]; myReactions: string[] }) => void
  onEdited: (next: ChatMessage) => void
  onDeleted: (id: string) => void
  onReplyClick: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [editValue, setEditValue] = useState(msg.body)
  const [editError, setEditError] = useState<string | null>(null)
  const [savingEdit, setSavingEdit] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const editRef = useRef<HTMLTextAreaElement>(null)

  const startEdit = () => {
    setEditValue(msg.body)
    setEditError(null)
    setEditing(true)
    requestAnimationFrame(() => editRef.current?.focus())
  }

  const cancelEdit = () => {
    setEditing(false)
    setEditError(null)
  }

  const saveEdit = async () => {
    setEditError(null)
    const trimmed = editValue.trim()
    if (trimmed === msg.body.trim()) {
      setEditing(false)
      return
    }
    setSavingEdit(true)
    try {
      const next = await editChatMessage({
        gameId: msg.gameId,
        sport: msg.sport,
        messageId: msg.id,
        body: trimmed,
      })
      onEdited(next)
      setEditing(false)
    } catch (e: unknown) {
      setEditError((e as Error)?.message ?? 'Edit failed')
    } finally {
      setSavingEdit(false)
    }
  }

  const onDelete = async () => {
    if (deleting) return
    if (typeof window !== 'undefined' && !window.confirm('Delete this take?')) return
    setDeleting(true)
    // Optimistic remove — server is authoritative on the next poll anyway.
    onDeleted(msg.id)
    try {
      await deleteChatMessage({ gameId: msg.gameId, sport: msg.sport, messageId: msg.id })
    } catch {
      // Best-effort; if delete fails, the next poll cycle will resurrect it
      // and the user can retry.
      setDeleting(false)
    }
  }

  return (
    <div className={`flex gap-2 ${msg.isMine ? 'flex-row-reverse' : ''}`}>
      <div className="flex-shrink-0">
        <AvatarSlot avatar={msg.avatar} size="sm" />
      </div>
      <div className={`flex-1 min-w-0 max-w-[80%] ${msg.isMine ? 'items-end' : ''}`}>
        <div className={`flex items-baseline gap-1.5 text-[10px] mb-0.5 ${msg.isMine ? 'justify-end' : ''}`}>
          <span className="font-black text-arena-red">@{msg.handle}</span>
          <span className="text-arena-muted-l dark:text-arena-muted-d font-mono">{formatChatTime(msg.createdAt)}</span>
          {msg.editedAt && (
            <span className="text-arena-muted-l dark:text-arena-muted-d italic" title={`Edited ${new Date(msg.editedAt).toLocaleString()}`}>
              edited
            </span>
          )}
        </div>
        {msg.replyTo && msg.replyToHandle && (
          <div className={`flex items-center gap-1 text-[10px] text-arena-muted-l dark:text-arena-muted-d mb-1 max-w-full ${msg.isMine ? 'justify-end' : ''}`}>
            <span className="text-arena-red font-bold">↳</span>
            <span className="font-bold">@{msg.replyToHandle}</span>
            {msg.replyToPreview && (
              <span className="truncate italic opacity-80">· {msg.replyToPreview}</span>
            )}
          </div>
        )}
        {editing ? (
          <div
            className={`inline-block w-full max-w-full rounded-2xl px-2 py-2 text-sm ${
              msg.isMine
                ? 'bg-arena-red/20 border border-arena-red'
                : 'bg-arena-paper dark:bg-arena-carbon border border-arena-border-l dark:border-arena-border-d'
            }`}
          >
            <textarea
              ref={editRef}
              value={editValue}
              onChange={(e) => {
                setEditValue(e.target.value)
                setEditError(null)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey && !e.metaKey) {
                  e.preventDefault()
                  saveEdit()
                } else if (e.key === 'Escape') {
                  e.preventDefault()
                  cancelEdit()
                }
              }}
              rows={2}
              maxLength={CHAT_BODY_MAX + 50}
              className="w-full resize-none rounded-lg bg-arena-card dark:bg-arena-surface border border-arena-border-l dark:border-arena-border-d px-2 py-1.5 text-sm focus:outline-none focus:border-arena-red"
            />
            <div className="mt-1 flex items-center justify-between gap-2 text-[10px]">
              <span className={editError ? 'text-arena-red font-bold' : 'text-arena-muted-l dark:text-arena-muted-d'}>
                {editError ?? 'Enter to save · Esc to cancel'}
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={cancelEdit}
                  disabled={savingEdit}
                  className="px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-arena-card dark:bg-arena-surface border border-arena-border-l dark:border-arena-border-d hover:border-arena-red hover:text-arena-red transition disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={saveEdit}
                  disabled={savingEdit}
                  className="px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-arena-red text-white hover:bg-red-700 transition disabled:opacity-50 flex items-center gap-1"
                >
                  {savingEdit ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                  Save
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div
            className={`inline-block max-w-full rounded-2xl px-3 py-2 text-sm break-words ${
              msg.isMine
                ? 'bg-arena-red text-white rounded-tr-sm'
                : 'bg-arena-paper dark:bg-arena-carbon border border-arena-border-l dark:border-arena-border-d rounded-tl-sm'
            }`}
          >
            {msg.body && (
              <ParsedBody body={msg.body} className="whitespace-pre-wrap leading-relaxed break-words" />
            )}
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
        )}
        <div className={`flex items-center gap-1 ${msg.isMine ? 'justify-end' : ''}`}>
          <ChatActions
            gameId={msg.gameId}
            sport={msg.sport}
            messageId={msg.id}
            reactions={msg.reactions}
            myReactions={msg.myReactions}
            shareText={msg.body}
            onReactionsChange={onReactionsChange}
            onReplyClick={onReplyClick}
          />
          {msg.isMine && !editing && (
            <>
              <button
                type="button"
                onClick={startEdit}
                disabled={deleting}
                className="flex-shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-wider text-arena-muted-l dark:text-arena-muted-d hover:text-arena-red hover:bg-arena-paper/60 dark:hover:bg-arena-carbon/60 transition disabled:opacity-40"
                aria-label="Edit your take"
              >
                <Pencil className="w-3 h-3" />
                Edit
              </button>
              <button
                type="button"
                onClick={onDelete}
                disabled={deleting}
                className="flex-shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-wider text-arena-muted-l dark:text-arena-muted-d hover:text-arena-red hover:bg-arena-paper/60 dark:hover:bg-arena-carbon/60 transition disabled:opacity-40"
                aria-label="Delete your take"
              >
                {deleting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                Delete
              </button>
            </>
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
  initialAvatar: Avatar
  onClose: () => void
  onSave: () => void
}) {
  const [handle, setHandleInput] = useState(initialHandle)
  const [avatar, setAvatarInput] = useState<Avatar>(initialAvatar)
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [emoteQuery, setEmoteQuery] = useState('')
  const [searchResults, setSearchResults] = useState<ArenaEmote[]>([])
  const [searchingEmotes, setSearchingEmotes] = useState(false)
  const [brokenUrls, setBrokenUrls] = useState<Set<string>>(new Set())
  const fileRef = useRef<HTMLInputElement>(null)

  // Track broken image URLs and hide their tiles on next render. Some 7TV V2
  // hex IDs redirect to V3 successors that 404 — onError catches those.
  const markBroken = useCallback((url: string) => {
    setBrokenUrls((prev) => {
      if (prev.has(url)) return prev
      const next = new Set(prev)
      next.add(url)
      return next
    })
  }, [])

  // Debounced 7TV search — fires 300ms after typing stops to avoid hammering
  // the public API on every keystroke. Cancels in-flight on rapid edits.
  useEffect(() => {
    const q = emoteQuery.trim()
    if (!q) {
      setSearchResults([])
      setSearchingEmotes(false)
      return
    }
    setSearchingEmotes(true)
    let cancelled = false
    const t = setTimeout(async () => {
      const hits = await searchSevenTv(q, 50)
      if (!cancelled) {
        setSearchResults(hits)
        setSearchingEmotes(false)
      }
    }, 300)
    return () => {
      cancelled = true
      clearTimeout(t)
    }
  }, [emoteQuery])

  const handleAvatarUpload = async (file: File) => {
    setUploading(true)
    setError(null)
    try {
      const form = new FormData()
      form.append('file', file)
      form.append('deviceId', getIdentity().deviceId)
      const resp = await fetch('/api/avatars/upload', { method: 'POST', body: form })
      const j = await resp.json()
      if (!resp.ok || !j.avatarUrl) {
        setError(j.error || 'Upload failed — try again')
        return
      }
      setAvatarInput(j.avatarUrl)
    } catch {
      setError('Upload failed — check your connection')
    } finally {
      setUploading(false)
    }
  }

  const save = () => {
    const result = setHandle(handle)
    if (!result.ok) {
      setError(result.error)
      return
    }
    setAvatar(avatar)
    // Persist to arena_handles in Mongo so the handle/avatar pair survives
    // beyond a single device's localStorage. Fire-and-forget — chat works
    // either way; this endpoint enables Phase-2 surfaces (verified handle,
    // mention auto-complete, profile lookup) without blocking the modal.
    fetch('/api/handles/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        deviceId: getIdentity().deviceId,
        handle: result.handle,
        avatar: avatar,
      }),
    }).catch(() => undefined)
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
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-[10px] font-black uppercase tracking-wider text-arena-muted-l dark:text-arena-muted-d">
                Avatar
              </label>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-full bg-arena-card dark:bg-arena-surface border border-arena-border-l dark:border-arena-border-d hover:border-arena-red hover:text-arena-red transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
              >
                {uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                {uploading ? 'Uploading…' : 'Upload'}
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) handleAvatarUpload(f)
                  e.target.value = ''
                }}
              />
            </div>

            {/* Selected preview row — always visible, makes the current pick obvious */}
            <div className="mb-2 flex items-center gap-2 p-2 rounded-lg bg-arena-card dark:bg-arena-surface border border-arena-red">
              <AvatarSlot avatar={avatar} size="lg" />
              <div className="text-[10px] text-arena-muted-l dark:text-arena-muted-d flex-1 leading-tight">
                {isUrlAvatar(avatar) ? 'Custom avatar set.' : 'Sport emoji selected.'} Tap any item below to switch.
              </div>
            </div>

            {/* Search any 7TV emote — type to query the open-source catalog. */}
            <div className="relative mb-2">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-arena-muted-l dark:text-arena-muted-d pointer-events-none" />
              <input
                type="text"
                value={emoteQuery}
                onChange={(e) => setEmoteQuery(e.target.value)}
                placeholder="Search emotes (catjam, kekw, gigachad…)"
                className="w-full rounded-lg bg-arena-card dark:bg-arena-surface border border-arena-border-l dark:border-arena-border-d pl-8 pr-8 py-2 text-xs focus:outline-none focus:border-arena-red"
              />
              {emoteQuery && (
                <button
                  type="button"
                  onClick={() => setEmoteQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full flex items-center justify-center hover:bg-arena-border-l dark:hover:bg-arena-border-d"
                  aria-label="Clear search"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
              {searchingEmotes && (
                <Loader2 className="absolute right-7 top-1/2 -translate-y-1/2 w-3.5 h-3.5 animate-spin text-arena-muted-l dark:text-arena-muted-d" />
              )}
            </div>

            {/* Mixed scroll grid: sport emojis + SC + Twitch + BTTV + FFZ + 7TV
                global. When user types in the search box, results from 7TV
                replace the catalog. Broken images auto-hide via onError. */}
            <div className="grid grid-cols-8 gap-1 max-h-80 overflow-y-auto p-1 rounded-lg bg-arena-paper/40 dark:bg-arena-carbon/40 border border-arena-border-l dark:border-arena-border-d">
              {/* Sport emoji default set (always visible — fast, no network) */}
              {!emoteQuery.trim() && ARENA_AVATARS.map((a) => (
                <button
                  key={`emoji-${a}`}
                  type="button"
                  onClick={() => setAvatarInput(a)}
                  title={a}
                  className={`aspect-square rounded-lg flex items-center justify-center text-xl transition ${
                    avatar === a
                      ? 'bg-arena-red ring-2 ring-arena-red'
                      : 'bg-arena-card dark:bg-arena-surface border border-arena-border-l dark:border-arena-border-d hover:border-arena-red'
                  }`}
                >
                  {a}
                </button>
              ))}
              {/* When searching: 7TV live results. Otherwise: every catalog stacked.
                  All four catalogs (SC + Twitch + 7TV global + BTTV + FFZ) are
                  baked into the bundle at build time — instant on modal open. */}
              {(emoteQuery.trim()
                ? searchResults
                : [...SC_EMOTES, ...TWITCH_EMOTES, ...PREFETCHED_EMOTES]
              )
                .filter((e) => !brokenUrls.has(e.url))
                .map((e) => (
                  <button
                    key={e.id}
                    type="button"
                    onClick={() => setAvatarInput(e.url)}
                    title={e.name}
                    className={`aspect-square rounded-lg flex items-center justify-center transition overflow-hidden ${
                      avatar === e.url
                        ? 'bg-arena-red ring-2 ring-arena-red'
                        : 'bg-arena-card dark:bg-arena-surface border border-arena-border-l dark:border-arena-border-d hover:border-arena-red'
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={e.url}
                      alt={e.name}
                      loading="lazy"
                      className="w-full h-full object-contain p-0.5"
                      onError={() => markBroken(e.url)}
                    />
                  </button>
                ))}
              {emoteQuery.trim() && !searchingEmotes && searchResults.length === 0 && (
                <div className="col-span-8 py-4 text-center text-[11px] text-arena-muted-l dark:text-arena-muted-d">
                  No emotes match "{emoteQuery.trim()}". Try another keyword.
                </div>
              )}
            </div>
            <p className="mt-1 text-[10px] text-arena-muted-l dark:text-arena-muted-d">
              Sport · 7TV · BTTV · FFZ · Twitch · {SC_EMOTES.length + TWITCH_EMOTES.length + PREFETCHED_EMOTES.length}+ emotes (instant) · search any 7TV emote · or upload your own (2 MB max)
            </p>
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
