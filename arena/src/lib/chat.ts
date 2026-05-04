/**
 * Chat client + types — talks to the arena/api/game/[id]/chat endpoints.
 *
 * Each game (NBA, NHL, MLB, WNBA, NFL, boxing, etc) has its own chat scoped
 * by ESPN's gameId. Per-device rate limit is enforced server-side; clients
 * just attach their deviceId so the server can throttle bursts.
 */

import { getIdentity, type ArenaAvatar } from './identity'
import type { SportKey } from './espn'

export const CHAT_BODY_MAX = 280
export const CHAT_IMAGE_MAX_BYTES = 5 * 1024 * 1024 // 5 MB
export const CHAT_POLL_INTERVAL_MS = 5_000

export type ChatMessage = {
  id: string
  gameId: string
  sport: SportKey
  handle: string
  avatar: string
  body: string
  mediaUrl?: string | null
  mediaType?: 'image' | null
  createdAt: string // ISO
  // Echoed back so the client can highlight its own messages without exposing
  // someone else's deviceId. Only present on messages this device authored.
  isMine?: boolean
}

export type ChatListResponse = {
  messages: ChatMessage[]
  nextCursor: string | null
}

const sportFromQuery = (sport: SportKey | string) => String(sport)

/** GET /api/game/[id]/chat — newest-first, paginated. */
export async function fetchChatMessages(args: {
  gameId: string
  sport: SportKey
  before?: string
  signal?: AbortSignal
}): Promise<ChatListResponse> {
  const { gameId, sport, before, signal } = args
  const { deviceId } = getIdentity()
  const params = new URLSearchParams({ sport: sportFromQuery(sport) })
  if (before) params.set('before', before)
  if (deviceId) params.set('deviceId', deviceId)
  const r = await fetch(`/api/game/${encodeURIComponent(gameId)}/chat?${params.toString()}`, {
    signal,
    cache: 'no-store',
  })
  if (!r.ok) throw new Error(`Chat fetch failed (${r.status})`)
  return r.json()
}

/** POST /api/game/[id]/chat — text-only message. */
export async function postChatMessage(args: {
  gameId: string
  sport: SportKey
  body: string
  mediaUrl?: string | null
}): Promise<ChatMessage> {
  const { gameId, sport, body, mediaUrl } = args
  const { handle, deviceId, avatar } = getIdentity()
  if (!handle) throw new Error('Set a handle before posting')
  const r = await fetch(`/api/game/${encodeURIComponent(gameId)}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sport: sportFromQuery(sport),
      body,
      mediaUrl: mediaUrl ?? null,
      handle,
      deviceId,
      avatar,
    }),
  })
  if (r.status === 429) {
    const j = await r.json().catch(() => ({}))
    throw new Error(j.error || 'Slow down — wait a few seconds before sending another message.')
  }
  if (!r.ok) {
    const j = await r.json().catch(() => ({}))
    throw new Error(j.error || `Send failed (${r.status})`)
  }
  return r.json()
}

/** POST /api/game/[id]/chat-image — multipart upload, pins to IPFS. */
export async function uploadChatImage(args: {
  gameId: string
  sport: SportKey
  file: File
}): Promise<{ mediaUrl: string }> {
  const { gameId, sport, file } = args
  if (file.size > CHAT_IMAGE_MAX_BYTES) {
    throw new Error('Image must be 5 MB or smaller')
  }
  if (!file.type.startsWith('image/')) {
    throw new Error('Pick an image file')
  }
  const { deviceId } = getIdentity()
  const fd = new FormData()
  fd.append('file', file)
  fd.append('sport', sportFromQuery(sport))
  if (deviceId) fd.append('deviceId', deviceId)
  const r = await fetch(`/api/game/${encodeURIComponent(gameId)}/chat-image`, {
    method: 'POST',
    body: fd,
  })
  if (!r.ok) {
    const j = await r.json().catch(() => ({}))
    throw new Error(j.error || `Upload failed (${r.status})`)
  }
  return r.json()
}

/** Helper for the GameChat component. */
export function formatChatTime(iso: string) {
  const then = new Date(iso).getTime()
  if (isNaN(then)) return ''
  const diffSec = Math.max(0, Math.floor((Date.now() - then) / 1000))
  if (diffSec < 5) return 'now'
  if (diffSec < 60) return `${diffSec}s`
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m`
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h`
  return new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric' })
}

export type { ArenaAvatar }
