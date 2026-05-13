/**
 * useStreamLogger — mint-side stream-reward logger.
 *
 * Pure hook, no UI. Wire it to any <audio> element via the play/pause/time
 * callbacks. Fires SC's logStream mutation at 30s of playback per track.
 *
 * Dedupe: max one log per trackId every 30s (matches the loop-counts-too
 * fix from web/'s useLogStream — see CLAUDE.md Jan 27 Bug #25).
 *
 * Usage:
 *   const logger = useStreamLogger({
 *     onReward: (r, title) => toast(`+${r} OGUN earned on "${title}"`),
 *   })
 *   ...
 *   audio.addEventListener('timeupdate', () => {
 *     if (audio.currentTime >= 30 && currentTrackScid) {
 *       logger.logIfQualified(currentTrackScid, Math.floor(audio.currentTime))
 *     }
 *   })
 */
import { useRef, useCallback } from 'react'
import { useAccount } from 'wagmi'

interface StreamLogOptions {
  /** Seconds threshold to qualify as a stream (default 30). */
  minDuration?: number
  /** Fires when listener earns OGUN (wallet present + reward > 0). */
  onReward?: (reward: number, trackTitle?: string) => void
  /** Fires when creator earns OGUN (always fires if reward > 0). */
  onCreatorReward?: (reward: number, trackTitle?: string) => void
  /** Fires when listener daily cap hit. */
  onListenerLimitReached?: () => void
}

interface LogStreamResult {
  success: boolean
  totalStreams: number
  creatorReward: number
  listenerReward: number
  creatorDailyLimitReached?: boolean
  listenerDailyLimitReached?: boolean
  trackTitle?: string
}

export function useStreamLogger(options: StreamLogOptions = {}) {
  const { minDuration = 30, onReward, onCreatorReward, onListenerLimitReached } = options
  const { address } = useAccount()

  /** Last successful log timestamp per scid (ms). Allows loop replays. */
  const lastLogged = useRef<Map<string, number>>(new Map())
  const inFlight = useRef<Set<string>>(new Set())

  const logIfQualified = useCallback(
    async (scid: string, duration: number) => {
      if (!scid || duration < minDuration) return null

      // Dedupe — don't re-log same scid more than once per minDuration window
      const now = Date.now()
      const last = lastLogged.current.get(scid)
      if (last && now - last < minDuration * 1000) return null

      // Single-flight per scid to avoid double-firing on rapid timeupdate events
      if (inFlight.current.has(scid)) return null
      inFlight.current.add(scid)

      try {
        const res = await fetch('/api/log-stream', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            scid,
            duration: Math.floor(duration),
            listenerWallet: address || undefined,
          }),
        })
        if (!res.ok) return null
        const data = (await res.json()) as LogStreamResult
        if (!data.success) return null

        lastLogged.current.set(scid, now)

        if (data.creatorReward > 0) {
          onCreatorReward?.(data.creatorReward, data.trackTitle)
        }
        if (data.listenerReward > 0) {
          onReward?.(data.listenerReward, data.trackTitle)
        }
        if (data.listenerDailyLimitReached) {
          onListenerLimitReached?.()
        }

        return data
      } catch {
        return null
      } finally {
        inFlight.current.delete(scid)
      }
    },
    [address, minDuration, onReward, onCreatorReward, onListenerLimitReached]
  )

  return { logIfQualified }
}
