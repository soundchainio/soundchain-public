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

/**
 * Reactions are emoji OR image (7TV/BTTV/FFZ/Twitch CDN URLs from arena's
 * shared emote catalog). The `key` is the canonical reaction identifier:
 * for emoji it's the unicode char; for images it's the URL itself.
 */
export type ChatReactionKind = 'emoji' | 'image'

export type ChatReaction = {
  key: string
  kind: ChatReactionKind
  count: number
}

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
  // Set when the author edited their message. Bubble shows a small "edited"
  // tag next to the timestamp; null on un-edited messages.
  editedAt?: string | null
  // Inline-reply backbone. When `replyTo` is set, this take is a reply to a
  // parent take in the same game. Handle + preview are denormalized at
  // write time so the bubble renders the "↳ replying to @handle: …" header
  // without an extra fetch. Phase 2 may add real thread expansion; Phase 1
  // is Twitter/X-style flat threading with visual parent context.
  replyTo?: string | null
  replyToHandle?: string | null
  replyToPreview?: string | null
  // Reaction counts + which reaction keys this device has applied. Default
  // to [] / [] so older docs that pre-date reactions render cleanly without
  // a migration step.
  reactions?: ChatReaction[]
  myReactions?: string[]
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
  /** Optional parent messageId — server denormalizes parent handle + preview. */
  replyTo?: string | null
}): Promise<ChatMessage> {
  const { gameId, sport, body, mediaUrl, replyTo } = args
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
      replyTo: replyTo ?? null,
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

/** PATCH /api/game/[id]/chat — edit your own take's body (typo fix). */
export async function editChatMessage(args: {
  gameId: string
  sport: SportKey
  messageId: string
  body: string
}): Promise<ChatMessage> {
  const { gameId, sport, messageId, body } = args
  const { deviceId } = getIdentity()
  if (!deviceId) throw new Error('No device id')
  const r = await fetch(`/api/game/${encodeURIComponent(gameId)}/chat`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sport: sportFromQuery(sport),
      messageId,
      body,
      deviceId,
    }),
  })
  if (!r.ok) {
    const j = await r.json().catch(() => ({}))
    throw new Error(j.error || `Edit failed (${r.status})`)
  }
  return r.json()
}

/** DELETE /api/game/[id]/chat?messageId=… — author-only delete. */
export async function deleteChatMessage(args: {
  gameId: string
  sport: SportKey
  messageId: string
}): Promise<{ ok: true; id: string }> {
  const { gameId, sport, messageId } = args
  const { deviceId } = getIdentity()
  if (!deviceId) throw new Error('No device id')
  const params = new URLSearchParams({
    sport: sportFromQuery(sport),
    messageId,
    deviceId,
  })
  const r = await fetch(`/api/game/${encodeURIComponent(gameId)}/chat?${params.toString()}`, {
    method: 'DELETE',
  })
  if (!r.ok) {
    const j = await r.json().catch(() => ({}))
    throw new Error(j.error || `Delete failed (${r.status})`)
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

/**
 * POST /api/game/[id]/chat-react — toggle an emoji/emote reaction on a take.
 * Server returns the authoritative reaction list + the device's current
 * reaction keys so the UI can settle after optimistic update.
 */
export async function reactToChatMessage(args: {
  gameId: string
  sport: SportKey
  messageId: string
  reactionKey: string
  reactionKind: ChatReactionKind
  toggle: 'add' | 'remove'
}): Promise<{ reactions: ChatReaction[]; myReactions: string[] }> {
  const { gameId, sport, messageId, reactionKey, reactionKind, toggle } = args
  const { deviceId } = getIdentity()
  if (!deviceId) throw new Error('No device id')
  const r = await fetch(`/api/game/${encodeURIComponent(gameId)}/chat-react`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sport: sportFromQuery(sport),
      messageId,
      reactionKey,
      reactionKind,
      toggle,
      deviceId,
    }),
  })
  if (!r.ok) {
    const j = await r.json().catch(() => ({}))
    throw new Error(j.error || `Reaction failed (${r.status})`)
  }
  return r.json()
}

/**
 * Build a public deep-link to a take. The `?take=` param is Phase-2
 * (auto-open the game modal scrolled to the message); today the sport hub
 * still loads cleanly without it. External-share is the primary use case.
 */
export function buildTakeShareUrl(args: { sport: SportKey | string; gameId: string; messageId: string }): string {
  const sport = String(args.sport).toLowerCase()
  const origin = typeof window !== 'undefined' && window.location?.origin
    ? window.location.origin
    : 'https://arena.soundchain.io'
  return `${origin}/${sport}?game=${encodeURIComponent(args.gameId)}&take=${encodeURIComponent(args.messageId)}`
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
