/**
 * Pseudonymous identity for arena Phase-1 chat.
 *
 * Phase 1 = auth-optional (per `c3a688a`). We don't ask users to sign in to
 * comment on a game — that would gut engagement. Instead, each device gets
 * a stable random `deviceId` (used for rate-limit + future "your messages"
 * filtering) and a chosen `handle` (display name). Both live in localStorage.
 *
 * Phase 2 will let SoundChain-authed users link their JWT here so verified
 * fans get a checkmark (and lose the device-id rate limit).
 */

const HANDLE_KEY = 'arena.chat.handle'
const DEVICE_KEY = 'arena.chat.deviceId'
const AVATAR_KEY = 'arena.chat.avatar'

const HANDLE_MAX = 24
const HANDLE_MIN = 2
const HANDLE_PATTERN = /^[a-zA-Z0-9_.-]+$/

// Sport-flavored emoji palette — keeps the chat reading like an arena, not a generic feed.
export const ARENA_AVATARS = [
  '🏀', '🏈', '⚾', '🏒', '⚽', '🎾', '🥊', '🏎️', '🎯', '🏆',
  '🔥', '⚡', '💪', '🚀', '👑', '🎮', '🎤', '🎧', '🎸', '🎬',
  '🦁', '🐺', '🦅', '🦈', '🐉', '🦍', '🐅', '🐂', '🦌', '🦬',
] as const

export type ArenaAvatar = (typeof ARENA_AVATARS)[number]

function randomDeviceId() {
  // Not crypto — just a stable opaque ID per device. 16 hex chars = 64 bits.
  let s = ''
  for (let i = 0; i < 16; i++) s += Math.floor(Math.random() * 16).toString(16)
  return s
}

function randomAvatar(): ArenaAvatar {
  return ARENA_AVATARS[Math.floor(Math.random() * ARENA_AVATARS.length)]
}

export function getDeviceId(): string {
  if (typeof window === 'undefined') return ''
  let id = localStorage.getItem(DEVICE_KEY)
  if (!id) {
    id = randomDeviceId()
    localStorage.setItem(DEVICE_KEY, id)
  }
  return id
}

export function getIdentity(): { handle: string | null; deviceId: string; avatar: ArenaAvatar } {
  if (typeof window === 'undefined') {
    return { handle: null, deviceId: '', avatar: ARENA_AVATARS[0] }
  }
  const handle = localStorage.getItem(HANDLE_KEY)
  const deviceId = getDeviceId()
  let avatar = (localStorage.getItem(AVATAR_KEY) as ArenaAvatar | null) || null
  if (!avatar || !ARENA_AVATARS.includes(avatar as ArenaAvatar)) {
    avatar = randomAvatar()
    localStorage.setItem(AVATAR_KEY, avatar)
  }
  return { handle, deviceId, avatar }
}

export function setHandle(raw: string): { ok: true; handle: string } | { ok: false; error: string } {
  const handle = raw.trim()
  if (handle.length < HANDLE_MIN) return { ok: false, error: `Handle must be at least ${HANDLE_MIN} characters` }
  if (handle.length > HANDLE_MAX) return { ok: false, error: `Handle must be ${HANDLE_MAX} characters or fewer` }
  if (!HANDLE_PATTERN.test(handle)) return { ok: false, error: 'Letters, numbers, dot, dash, underscore only' }
  localStorage.setItem(HANDLE_KEY, handle)
  return { ok: true, handle }
}

export function setAvatar(avatar: ArenaAvatar): void {
  if (!ARENA_AVATARS.includes(avatar)) return
  localStorage.setItem(AVATAR_KEY, avatar)
}

export function clearIdentity() {
  localStorage.removeItem(HANDLE_KEY)
  localStorage.removeItem(AVATAR_KEY)
  // Keep DEVICE_KEY — it's the device-side rate-limit signal, not a personal identifier.
}
