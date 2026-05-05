/**
 * Notifications client — talks to /api/notifications/recent.
 *
 * Today: drives the bell badge + dropdown in arena's UI.
 * Tomorrow: when the Capacitor shell ships, the native worker plugs into
 * the same endpoint to render OS-level push. Keep the response shape
 * stable so the worker can ship without server changes.
 */

import { getIdentity } from './identity'

export type ArenaNotification = {
  id: string
  type: 'mention' | 'reaction'
  gameId: string
  sport: string
  messageId: string
  actorHandle: string
  actorAvatar: string
  preview: string
  reactionKey?: string | null
  reactionKind?: 'emoji' | 'image' | null
  read: boolean
  createdAt: string
}

export type NotificationsResponse = {
  notifications: ArenaNotification[]
  unreadCount: number
}

export async function fetchNotifications(opts?: { markRead?: boolean; limit?: number }): Promise<NotificationsResponse> {
  const { deviceId } = getIdentity()
  if (!deviceId) return { notifications: [], unreadCount: 0 }
  const params = new URLSearchParams({ deviceId })
  if (opts?.limit) params.set('limit', String(opts.limit))
  if (opts?.markRead) params.set('markRead', '1')
  const r = await fetch(`/api/notifications/recent?${params.toString()}`, { cache: 'no-store' })
  if (!r.ok) throw new Error(`Notifications fetch failed (${r.status})`)
  return r.json()
}
