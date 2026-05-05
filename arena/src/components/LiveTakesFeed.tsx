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
import { isUrlAvatar, getIdentity } from '@/lib/identity'
import type { ChatReaction } from '@/lib/chat'
import { ChatActions } from './ChatActions'
import { ParsedBody } from './ParsedBody'
import { NotificationBell } from './NotificationBell'

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
  reactions?: ChatReaction[]
  myReactions?: string[]
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
    <section className="max-w-7xl mx-auto px-4 py-10 sm:py-12">
      <div className="flex items-center justify-between mb-4">
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

      <div className="rounded-2xl border border-arena-border-l dark:border-arena-border-d bg-arena-card dark:bg-arena-surface overflow-hidden">
        <ul className="divide-y divide-arena-border-l dark:divide-arena-border-d">
          {takes!.map((t) => {
            const meta = SPORT_META[t.sport] ?? { label: t.sport.toUpperCase(), route: '/live', accent: 'text-arena-muted-l dark:text-arena-muted-d border-arena-border-l dark:border-arena-border-d bg-transparent' }
            return (
              <li key={t.id} className="p-3 sm:p-4 hover:bg-arena-paper/60 dark:hover:bg-arena-carbon/40 transition">
                <div className="flex items-start gap-3">
                  {isUrlAvatar(t.avatar) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={t.avatar}
                      alt=""
                      loading="lazy"
                      className="w-8 h-8 rounded-full object-cover border border-arena-border-l dark:border-arena-border-d flex-shrink-0 mt-0.5"
                    />
                  ) : (
                    <span className="text-2xl leading-none flex-shrink-0 mt-0.5" aria-hidden>
                      {t.avatar || '🏟️'}
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-sm font-bold truncate max-w-[120px] sm:max-w-none">
                        @{t.handle}
                      </span>
                      <Link href={meta.route} className={`text-[9px] font-mono tracking-wider px-1.5 py-0.5 rounded-full border hover:opacity-80 ${meta.accent}`}>
                        {meta.label}
                      </Link>
                      <span className="text-[10px] text-arena-muted-l dark:text-arena-muted-d ml-auto">
                        {formatRelative(t.createdAt)}
                      </span>
                    </div>
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
                      onReactionsChange={(next) => {
                        setTakes((prev) =>
                          prev
                            ? prev.map((p) => (p.id === t.id ? { ...p, reactions: next.reactions, myReactions: next.myReactions } : p))
                            : prev,
                        )
                      }}
                    />
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
