/**
 * LiveTakesFeed — homepage cross-game fan takes stream.
 *
 * Polls /api/chat/recent every 8s (paused when tab hidden — saves battery
 * on mobile). Renders the freshest 10 takes from EVERY game in one column
 * so a visitor lands and IMMEDIATELY sees other fans engaging.
 *
 * Each take row links to its sport hub (e.g. /nba) — Phase 2 deep-link can
 * jump straight into the game modal once we wire ?game= query param.
 */

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Loader2, MessageCircle } from 'lucide-react'
import { isUrlAvatar, getIdentity, setHandle, setAvatar, ARENA_AVATARS, type Avatar } from '@/lib/identity'
import type { ChatReaction } from '@/lib/chat'
import type { SportKey } from '@/lib/espn'
import { postChatMessage } from '@/lib/chat'
import { ChatActions } from './ChatActions'
import { ParsedBody } from './ParsedBody'
import { NotificationBell } from './NotificationBell'
import { GifPicker } from './GifPicker'
import { ArenaReplyThread } from './ArenaReplyThread'

const POLL_MS = 8_000
const FETCH_LIMIT = 12

type RecentTake = {
  id: string
  gameId: string
  sport: string
  handle: string
  avatar: string
  body: string
  mediaUrl?: string | null
  mediaType?: 'image' | null
  createdAt: string
  replyTo?: string | null
  replyToHandle?: string | null
  replyToPreview?: string | null
  reactions?: ChatReaction[]
  myReactions?: string[]
  replyCount?: number
}

// Sport key → friendly label + accent + route. The chat API stores lowercase
// sport keys ('nba', 'mlb', etc); route paths match the existing arena page set.
const SPORT_META: Record<string, { label: string; route: string; accent: string }> = {
  nba:    { label: 'NBA',     route: '/nba',     accent: 'text-orange-500 border-orange-500/40 bg-orange-500/5' },
  nhl:    { label: 'NHL',     route: '/nhl',     accent: 'text-cyan-500 border-cyan-500/40 bg-cyan-500/5' },
  mlb:    { label: 'MLB',     route: '/mlb',     accent: 'text-red-500 border-red-500/40 bg-red-500/5' },
  wnba:   { label: 'WNBA',    route: '/wnba',    accent: 'text-pink-500 border-pink-500/40 bg-pink-500/5' },
  nfl:    { label: 'NFL',     route: '/nfl',     accent: 'text-amber-500 border-amber-500/40 bg-amber-500/5' },
  ncaaf:  { label: 'NCAAF',   route: '/ncaaf',   accent: 'text-purple-500 border-purple-500/40 bg-purple-500/5' },
  ncaab:  { label: 'NCAAB',   route: '/ncaab',   accent: 'text-purple-500 border-purple-500/40 bg-purple-500/5' },
  mma:    { label: 'MMA',     route: '/mma',     accent: 'text-rose-500 border-rose-500/40 bg-rose-500/5' },
  boxing: { label: 'BOXING',  route: '/boxing',  accent: 'text-rose-600 border-rose-600/40 bg-rose-600/5' },
  f1:     { label: 'F1',      route: '/f1',      accent: 'text-red-600 border-red-600/40 bg-red-600/5' },
  epl:    { label: 'EPL',     route: '/epl',     accent: 'text-emerald-500 border-emerald-500/40 bg-emerald-500/5' },
  mls:    { label: 'MLS',     route: '/mls',     accent: 'text-emerald-500 border-emerald-500/40 bg-emerald-500/5' },
  soccer: { label: 'SOCCER',  route: '/soccer',  accent: 'text-emerald-500 border-emerald-500/40 bg-emerald-500/5' },
}

function formatRelative(iso: string): string {
  const d = new Date(iso).getTime()
  if (!isFinite(d)) return ''
  const diffSec = Math.max(0, Math.floor((Date.now() - d) / 1000))
  if (diffSec < 60) return `${diffSec}s ago`
  const min = Math.floor(diffSec / 60)
  if (min < 60) return `${min}m ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h ago`
  const day = Math.floor(hr / 24)
  return `${day}d ago`
}

export function LiveTakesFeed() {
  const [takes, setTakes] = useState<RecentTake[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const cancelledRef = useRef(false)
  // Inline replies (like feed/wall posts) — fans engage with each other right
  // from the homepage takes stream.
  const [replyingId, setReplyingId] = useState<string | null>(null)
  const [replyText, setReplyText] = useState('')
  const [sending, setSending] = useState(false)
  const [openThreadId, setOpenThreadId] = useState<string | null>(null)
  const [threads, setThreads] = useState<Record<string, RecentTake[]>>({})
  const [gifFor, setGifFor] = useState<string | null>(null)
  // Posting needs a handle (the chat API 400s without one). Arena is "no login,
  // just sports" — so we prompt for a handle inline rather than an auth gate.
  const [myHandle, setMyHandle] = useState<string | null>(null)
  const [handleInput, setHandleInput] = useState('')
  const [replyErr, setReplyErr] = useState<string | null>(null)
  const [myAvatar, setMyAvatar] = useState<Avatar>(ARENA_AVATARS[0])
  const [avatarUploading, setAvatarUploading] = useState(false)

  useEffect(() => {
    const id = getIdentity()
    setMyHandle(id.handle)
    setMyAvatar(id.avatar)
  }, [])

  // Upload a custom avatar pic (Pinata via /api/avatars/upload) and persist it.
  const uploadAvatar = async (file: File) => {
    setAvatarUploading(true); setReplyErr(null)
    try {
      const form = new FormData()
      form.append('file', file)
      form.append('deviceId', getIdentity().deviceId)
      const resp = await fetch('/api/avatars/upload', { method: 'POST', body: form })
      const j = await resp.json()
      if (!resp.ok || !j.avatarUrl) { setReplyErr(j.error || 'Avatar upload failed'); return }
      setAvatar(j.avatarUrl as Avatar); setMyAvatar(j.avatarUrl)
    } catch {
      setReplyErr('Avatar upload failed — check your connection')
    } finally {
      setAvatarUploading(false)
    }
  }
  const pickEmojiAvatar = (a: Avatar) => { setAvatar(a); setMyAvatar(a) }

  // Ensure a handle exists before posting; sets one from handleInput if needed.
  const ensureHandle = (): boolean => {
    if (myHandle) return true
    const r = setHandle(handleInput.trim())
    if (!r.ok) { setReplyErr(r.error || 'Pick a handle to post'); return false }
    setMyHandle(r.handle); setReplyErr(null); setHandleInput('')
    return true
  }

  const fetchThread = async (id: string) => {
    try {
      const r = await fetch(`/api/chat/recent?thread=${encodeURIComponent(id)}`, { cache: 'no-store' })
      if (r.ok) {
        const data = await r.json()
        setThreads((prev) => ({ ...prev, [id]: Array.isArray(data?.messages) ? data.messages : [] }))
      }
    } catch { /* ignore — non-fatal */ }
  }

  const toggleThread = (t: RecentTake) => {
    if (openThreadId === t.id) { setOpenThreadId(null); return }
    setOpenThreadId(t.id)
    if (!threads[t.id]) fetchThread(t.id)
  }

  const submitReply = async (t: RecentTake) => {
    const body = replyText.trim()
    if (!body || sending) return
    if (!ensureHandle()) return
    setSending(true); setReplyErr(null)
    try {
      await postChatMessage({ gameId: t.gameId, sport: t.sport as SportKey, body, replyTo: t.id })
      setReplyText('')
      setReplyingId(null)
      // Optimistic count bump + open the thread, then re-fetch the real replies.
      setTakes((prev) => prev ? prev.map((p) => (p.id === t.id ? { ...p, replyCount: (p.replyCount ?? 0) + 1 } : p)) : prev)
      setOpenThreadId(t.id)
      await fetchThread(t.id)
    } catch (e) {
      setReplyErr((e as Error)?.message ?? 'Reply failed — try again')
    } finally {
      setSending(false)
    }
  }

  // Reply with a GIPHY gif — posted as a media-only reply (same as text replies,
  // just mediaUrl instead of body). Server gates giphy.com hosts.
  const submitGifReply = async (t: RecentTake, gifUrl: string) => {
    setGifFor(null)
    if (!ensureHandle()) { setReplyingId(t.id); return }
    setReplyingId(null)
    try {
      await postChatMessage({ gameId: t.gameId, sport: t.sport as SportKey, body: '', mediaUrl: gifUrl, replyTo: t.id })
      setTakes((prev) => prev ? prev.map((p) => (p.id === t.id ? { ...p, replyCount: (p.replyCount ?? 0) + 1 } : p)) : prev)
      setOpenThreadId(t.id)
      await fetchThread(t.id)
    } catch (e) {
      setReplyErr((e as Error)?.message ?? 'GIF reply failed')
    }
  }

  useEffect(() => {
    cancelledRef.current = false

    const load = async () => {
      try {
        // Pass deviceId so the server returns this device's myReactions per take.
        const { deviceId } = getIdentity()
        const params = new URLSearchParams({ limit: String(FETCH_LIMIT) })
        if (deviceId) params.set('deviceId', deviceId)
        const r = await fetch(`/api/chat/recent?${params.toString()}`, { cache: 'no-store' })
        if (cancelledRef.current) return
        if (!r.ok) {
          setError(`Couldn't load takes (${r.status})`)
          return
        }
        const data = await r.json()
        setTakes(Array.isArray(data?.messages) ? data.messages : [])
        setError(null)
      } catch (_e) {
        if (!cancelledRef.current) setError('Network hiccup — retrying soon')
      } finally {
        if (!cancelledRef.current && !document.hidden) {
          timeoutRef.current = setTimeout(load, POLL_MS)
        }
      }
    }

    const onVisibility = () => {
      if (document.hidden) {
        if (timeoutRef.current) clearTimeout(timeoutRef.current)
      } else {
        load()
      }
    }

    load()
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      cancelledRef.current = true
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])

  // Initial loading state — keep the section height stable so the homepage
  // doesn't jump when takes arrive on first poll.
  if (takes === null && !error) {
    return (
      <section className="max-w-7xl mx-auto px-4 py-10 sm:py-12">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs font-black uppercase tracking-[0.3em] text-arena-muted-l dark:text-arena-muted-d">
            Live takes · Right now
          </h2>
          <Loader2 className="w-3.5 h-3.5 animate-spin text-arena-muted-l dark:text-arena-muted-d" />
        </div>
        <div className="rounded-2xl border border-arena-border-l dark:border-arena-border-d bg-arena-card dark:bg-arena-surface p-8 text-center">
          <Loader2 className="w-5 h-5 animate-spin text-arena-muted-l dark:text-arena-muted-d mx-auto mb-2" />
          <p className="text-xs text-arena-muted-l dark:text-arena-muted-d">Loading fan takes…</p>
        </div>
      </section>
    )
  }

  // Error state — show inline, don't block the rest of the page.
  if (error && (!takes || takes.length === 0)) {
    return (
      <section className="max-w-7xl mx-auto px-4 py-10 sm:py-12">
        <h2 className="text-xs font-black uppercase tracking-[0.3em] text-arena-muted-l dark:text-arena-muted-d mb-4">
          Live takes · Right now
        </h2>
        <div className="rounded-2xl border border-arena-border-l dark:border-arena-border-d bg-arena-card dark:bg-arena-surface p-6 text-center">
          <p className="text-sm text-arena-muted-l dark:text-arena-muted-d">{error}</p>
        </div>
      </section>
    )
  }

  // Empty state — invite first-mover engagement instead of showing nothing.
  if (takes && takes.length === 0) {
    return (
      <section className="max-w-7xl mx-auto px-4 py-10 sm:py-12">
        <h2 className="text-xs font-black uppercase tracking-[0.3em] text-arena-muted-l dark:text-arena-muted-d mb-4">
          Live takes · Be first
        </h2>
        <div className="rounded-2xl border border-arena-border-l dark:border-arena-border-d bg-arena-card dark:bg-arena-surface p-8 text-center">
          <MessageCircle className="w-6 h-6 text-arena-red mx-auto mb-3" />
          <h3 className="text-base font-black mb-2">Drop the first take</h3>
          <p className="text-sm text-arena-muted-l dark:text-arena-muted-d max-w-md mx-auto mb-4">
            Tap any game pill above, scroll past the box score, and leave a take.
            Other fans see it instantly. No login. No accounts. Just sports.
          </p>
          <Link
            href="/live"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-arena-red hover:underline"
          >
            Find a live game <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </section>
    )
  }

  return (
    <section className="max-w-7xl mx-auto px-4 py-6 sm:py-8">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-black uppercase tracking-[0.3em] text-arena-muted-l dark:text-arena-muted-d">
          Live takes · Right now
        </h2>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 text-[10px] font-mono tracking-wider text-arena-red">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full rounded-full bg-arena-red opacity-75 animate-ping" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-arena-red" />
            </span>
            LIVE
          </span>
          <NotificationBell />
        </div>
      </div>

      {/* Cyberpunk slim — hairline border, tighter rows, subtle holo
          underglow on hover. Frank May 6 directive. */}
      <div className="rounded-xl border border-arena-border-l/70 dark:border-arena-border-d/70 bg-arena-card dark:bg-arena-surface overflow-hidden">
        <ul className="divide-y divide-arena-border-l/60 dark:divide-arena-border-d/60">
          {takes!.map((t) => {
            const meta = SPORT_META[t.sport] ?? { label: t.sport.toUpperCase(), route: '/live', accent: 'text-arena-muted-l dark:text-arena-muted-d border-arena-border-l dark:border-arena-border-d bg-transparent' }
            return (
              <li key={t.id} className="px-3 py-2.5 sm:px-4 sm:py-3 hover:bg-arena-paper/60 dark:hover:bg-arena-carbon/40 hover:shadow-[inset_0_0_0_1px_rgba(220,38,38,0.15)] transition">
                <div className="flex items-start gap-2.5">
                  {isUrlAvatar(t.avatar) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={t.avatar}
                      alt=""
                      loading="lazy"
                      className="w-7 h-7 rounded-full object-cover border border-arena-border-l/70 dark:border-arena-border-d/70 flex-shrink-0 mt-0.5"
                    />
                  ) : (
                    <span className="text-xl leading-none flex-shrink-0 mt-0.5" aria-hidden>
                      {t.avatar || '🏟️'}
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-sm font-bold truncate max-w-[120px] sm:max-w-none">
                        @{t.handle}
                      </span>
                      <Link href={meta.route} className={`inline-flex items-center leading-none whitespace-nowrap shrink-0 text-[9px] font-mono tracking-wider px-1.5 py-0.5 rounded-full border hover:opacity-80 ${meta.accent}`}>
                        {meta.label}
                      </Link>
                      <span className="text-[10px] text-arena-muted-l dark:text-arena-muted-d ml-auto">
                        {formatRelative(t.createdAt)}
                      </span>
                    </div>
                    {t.replyTo && t.replyToHandle && (
                      <div className="flex items-center gap-1 text-[10px] text-arena-muted-l dark:text-arena-muted-d mb-1">
                        <span className="text-arena-red font-bold">↳</span>
                        <span className="font-bold">@{t.replyToHandle}</span>
                        {t.replyToPreview && (
                          <span className="truncate italic opacity-80">· {t.replyToPreview}</span>
                        )}
                      </div>
                    )}
                    {t.body && (
                      <ParsedBody
                        body={t.body}
                        className="text-sm text-arena-text-l dark:text-arena-text-d leading-snug break-words"
                      />
                    )}
                    {t.mediaUrl && t.mediaType === 'image' && (
                      <img
                        src={t.mediaUrl}
                        alt=""
                        loading="lazy"
                        className="mt-2 max-h-48 rounded-lg border border-arena-border-l dark:border-arena-border-d"
                      />
                    )}
                    <ChatActions
                      compact
                      gameId={t.gameId}
                      sport={t.sport}
                      messageId={t.id}
                      reactions={t.reactions}
                      myReactions={t.myReactions}
                      shareText={t.body}
                      onReplyClick={() => {
                        setReplyText('')
                        setReplyingId((cur) => (cur === t.id ? null : t.id))
                      }}
                      onReactionsChange={(next) => {
                        setTakes((prev) =>
                          prev
                            ? prev.map((p) => (p.id === t.id ? { ...p, reactions: next.reactions, myReactions: next.myReactions } : p))
                            : prev,
                        )
                      }}
                    />

                    {/* Reply count → expand the inline thread, like feed/wall posts. */}
                    {(t.replyCount ?? 0) > 0 && (
                      <button
                        onClick={() => toggleThread(t)}
                        className="mt-1 inline-flex items-center gap-1 text-[11px] font-bold text-arena-red hover:underline"
                      >
                        <MessageCircle className="w-3 h-3" />
                        {t.replyCount} {t.replyCount === 1 ? 'reply' : 'replies'}
                        <span className="text-[8px]">{openThreadId === t.id ? '▲' : '▼'}</span>
                      </button>
                    )}

                    {/* Inline reply composer — text or a GIPHY gif. Anonymous fans
                        pick a handle inline (no login) the first time they post. */}
                    {replyingId === t.id && (
                      <div className="mt-2 space-y-2">
                        {/* Avatar — emoji quick-picks or upload your own pic for the pill. */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="flex-shrink-0">
                            {isUrlAvatar(myAvatar) ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={myAvatar} alt="" className="w-7 h-7 rounded-full object-cover border border-arena-red" />
                            ) : (
                              <span className="w-7 h-7 inline-flex items-center justify-center text-lg leading-none rounded-full border border-arena-red bg-arena-paper dark:bg-arena-carbon">{myAvatar}</span>
                            )}
                          </span>
                          {ARENA_AVATARS.slice(0, 6).map((a) => (
                            <button
                              key={a}
                              onClick={() => pickEmojiAvatar(a)}
                              className={`w-7 h-7 inline-flex items-center justify-center text-base leading-none rounded-full border transition ${myAvatar === a ? 'border-arena-red bg-arena-red/15' : 'border-arena-border-l dark:border-arena-border-d hover:border-arena-red'}`}
                            >
                              {a}
                            </button>
                          ))}
                          <label className={`flex-shrink-0 cursor-pointer rounded-full border border-arena-border-l dark:border-arena-border-d px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider hover:border-arena-red hover:text-arena-red ${avatarUploading ? 'opacity-50' : ''}`}>
                            {avatarUploading ? '…' : '📷 Pic'}
                            <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" disabled={avatarUploading}
                              onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadAvatar(f); e.target.value = '' }} />
                          </label>
                        </div>
                        {!myHandle ? (
                          <div className="flex items-center gap-2">
                            <input
                              value={handleInput}
                              onChange={(e) => setHandleInput(e.target.value)}
                              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); ensureHandle() } }}
                              placeholder="Pick a handle to post (e.g. yeah_guy)"
                              autoFocus
                              maxLength={24}
                              className="flex-1 min-w-0 rounded-lg border border-arena-red/40 bg-arena-paper dark:bg-arena-carbon px-3 py-1.5 text-sm outline-none focus:border-arena-red"
                            />
                            <button
                              onClick={() => ensureHandle()}
                              disabled={!handleInput.trim()}
                              className="flex-shrink-0 rounded-lg border border-arena-red bg-arena-red/15 px-3 py-1.5 text-xs font-bold text-arena-red disabled:opacity-40"
                            >
                              Set handle
                            </button>
                          </div>
                        ) : (
                          <div className="text-[11px] text-arena-muted-l dark:text-arena-muted-d">
                            Posting as <span className="font-bold text-arena-red">@{myHandle}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => { if (!ensureHandle()) return; setGifFor((cur) => (cur === t.id ? null : t.id)) }}
                            aria-label="Reply with a GIF"
                            className={`flex-shrink-0 rounded-lg border px-2 py-1.5 text-[11px] font-black tracking-wide ${gifFor === t.id ? 'border-arena-red text-arena-red' : 'border-arena-border-l dark:border-arena-border-d text-arena-muted-l dark:text-arena-muted-d hover:text-arena-red hover:border-arena-red/60'}`}
                          >
                            GIF
                          </button>
                          <input
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitReply(t) } }}
                            placeholder={`Reply to @${t.handle}…`}
                            autoFocus={!!myHandle}
                            maxLength={500}
                            className="flex-1 min-w-0 rounded-lg border border-arena-border-l dark:border-arena-border-d bg-arena-paper dark:bg-arena-carbon px-3 py-1.5 text-sm outline-none focus:border-arena-red/60"
                          />
                          <button
                            onClick={() => submitReply(t)}
                            disabled={sending || !replyText.trim() || (!myHandle && !handleInput.trim())}
                            className="flex-shrink-0 rounded-lg bg-arena-red px-3 py-1.5 text-xs font-bold text-white disabled:opacity-40"
                          >
                            {sending ? '…' : 'Reply'}
                          </button>
                        </div>
                        {replyErr && <div className="text-[11px] text-arena-red">{replyErr}</div>}
                      </div>
                    )}

                    {/* GIPHY picker for a gif reply. */}
                    {gifFor === t.id && (
                      <GifPicker
                        onSelect={(gifUrl) => submitGifReply(t, gifUrl)}
                        onClose={() => setGifFor(null)}
                      />
                    )}

                    {/* Inline thread — recursive: every reply is itself repliable. */}
                    {openThreadId === t.id && (
                      <div className="mt-2 border-l-2 border-arena-red/25 pl-3">
                        <ArenaReplyThread parentId={t.id} gameId={t.gameId} sport={t.sport} />
                      </div>
                    )}
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
        <div className="px-4 py-3 border-t border-arena-border-l dark:border-arena-border-d text-center">
          <Link
            href="/live"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-arena-red hover:underline"
          >
            Open live games to drop your take <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </div>
    </section>
  )
}
