/**
 * NotificationBell — bell icon with unread badge + dropdown.
 *
 * Polls /api/notifications/recent every 30s (paused when tab hidden, same
 * battery hygiene as LiveTakesFeed). Tapping the bell opens a dropdown
 * listing the freshest 20 notifications and marks all unread as read.
 *
 * This is the notification-ready signal Frank wanted for native push:
 * the same data + same endpoint will drive Capacitor OS-level push when
 * the native shells ship.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { Bell, Loader2 } from 'lucide-react'
import { fetchNotifications, type ArenaNotification } from '@/lib/notifications'
import { isUrlAvatar } from '@/lib/identity'

const POLL_MS = 30_000

const SPORT_ROUTE: Record<string, string> = {
  nba: '/nba', nhl: '/nhl', mlb: '/mlb', wnba: '/wnba', nfl: '/nfl',
  ncaaf: '/ncaaf', ncaab: '/ncaab', mma: '/mma', boxing: '/boxing',
  f1: '/f1', epl: '/epl', mls: '/mls', soccer: '/soccer',
}

export function NotificationBell({ className }: { className?: string }) {
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<ArenaNotification[] | null>(null)
  const [unreadCount, setUnreadCount] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const cancelledRef = useRef(false)

  const load = useCallback(async (markRead?: boolean) => {
    try {
      const r = await fetchNotifications({ markRead, limit: 20 })
      if (cancelledRef.current) return
      setNotifications(r.notifications)
      setUnreadCount(r.unreadCount)
      setError(null)
    } catch (e: unknown) {
      if (!cancelledRef.current) setError((e as Error)?.message || 'Notifications unavailable')
    } finally {
      if (!cancelledRef.current && !document.hidden) {
        timeoutRef.current = setTimeout(() => load(false), POLL_MS)
      }
    }
  }, [])

  useEffect(() => {
    cancelledRef.current = false
    load(false)
    const onVisibility = () => {
      if (document.hidden) {
        if (timeoutRef.current) clearTimeout(timeoutRef.current)
      } else {
        load(false)
      }
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      cancelledRef.current = true
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [load])

  const handleOpen = () => {
    if (open) {
      setOpen(false)
      return
    }
    setOpen(true)
    // Mark-read on open. Optimistic: clear badge immediately; server confirms.
    setUnreadCount(0)
    load(true)
  }

  return (
    <div className={`relative ${className ?? ''}`}>
      <button
        type="button"
        onClick={handleOpen}
        className="relative w-9 h-9 rounded-full flex items-center justify-center text-arena-muted-l dark:text-arena-muted-d hover:text-arena-red hover:bg-arena-paper/60 dark:hover:bg-arena-carbon/40 transition"
        aria-label="Notifications"
        title={unreadCount > 0 ? `${unreadCount} new` : 'Notifications'}
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-arena-red text-white text-[9px] font-black flex items-center justify-center leading-none">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          {/* Click-away catcher */}
          <button
            type="button"
            aria-hidden
            tabIndex={-1}
            className="fixed inset-0 z-[150] cursor-default"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 top-full mt-1.5 w-[min(360px,calc(100vw-2rem))] z-[160] rounded-2xl border border-arena-border-l dark:border-arena-border-d bg-arena-paper dark:bg-arena-carbon shadow-2xl overflow-hidden">
            <div className="px-4 py-2.5 border-b border-arena-border-l dark:border-arena-border-d flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-wider">Notifications</h3>
              <span className="text-[10px] text-arena-muted-l dark:text-arena-muted-d">
                Native push coming soon
              </span>
            </div>

            <div className="max-h-[400px] overflow-y-auto">
              {notifications === null && !error && (
                <div className="px-4 py-6 text-center">
                  <Loader2 className="w-5 h-5 animate-spin text-arena-muted-l dark:text-arena-muted-d mx-auto" />
                </div>
              )}

              {error && (
                <div className="px-4 py-6 text-center text-xs text-arena-muted-l dark:text-arena-muted-d">
                  {error}
                </div>
              )}

              {notifications && notifications.length === 0 && (
                <div className="px-4 py-8 text-center">
                  <Bell className="w-5 h-5 text-arena-muted-l dark:text-arena-muted-d mx-auto mb-2" />
                  <p className="text-xs text-arena-muted-l dark:text-arena-muted-d">
                    No notifications yet. Drop a take or react to fire one up.
                  </p>
                </div>
              )}

              {notifications && notifications.length > 0 && (
                <ul className="divide-y divide-arena-border-l dark:divide-arena-border-d">
                  {notifications.map((n) => (
                    <li key={n.id} className={`px-3 py-2.5 ${n.read ? '' : 'bg-arena-red/5'}`}>
                      <a
                        href={SPORT_ROUTE[n.sport] ?? '/live'}
                        className="flex items-start gap-2"
                        onClick={() => setOpen(false)}
                      >
                        {/* Actor avatar */}
                        <div className="flex-shrink-0 mt-0.5">
                          {isUrlAvatar(n.actorAvatar) ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={n.actorAvatar}
                              alt=""
                              loading="lazy"
                              className="w-7 h-7 rounded-full object-cover border border-arena-border-l dark:border-arena-border-d"
                            />
                          ) : (
                            <span className="text-xl leading-none w-7 h-7 flex items-center justify-center" aria-hidden>
                              {n.actorAvatar || '🏟️'}
                            </span>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs leading-snug">
                            <span className="font-bold text-arena-red">@{n.actorHandle}</span>{' '}
                            {n.type === 'mention' ? (
                              <span className="text-arena-muted-l dark:text-arena-muted-d">mentioned you</span>
                            ) : (
                              <span className="text-arena-muted-l dark:text-arena-muted-d inline-flex items-center gap-1">
                                reacted{' '}
                                {n.reactionKey && n.reactionKind === 'emoji' && (
                                  <span className="text-sm">{n.reactionKey}</span>
                                )}
                                {n.reactionKey && n.reactionKind === 'image' && (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img src={n.reactionKey} alt="" className="w-4 h-4 object-contain inline" />
                                )}
                              </span>
                            )}
                          </div>
                          {n.preview && (
                            <p className="text-xs text-arena-muted-l dark:text-arena-muted-d mt-0.5 line-clamp-2">
                              {n.preview}
                            </p>
                          )}
                          <div className="text-[10px] text-arena-muted-l dark:text-arena-muted-d font-mono mt-0.5">
                            {formatRelative(n.createdAt)} · {n.sport.toUpperCase()}
                          </div>
                        </div>
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
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
