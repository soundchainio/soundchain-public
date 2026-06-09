/**
 * useStreamLogger — mint-side OGUN stream-reward logger.
 *
 * Pure hook, no UI. Call logIfQualified(trackId, seconds) from an <audio>
 * timeupdate handler; at >=30s of playback it POSTs /api/log-stream which
 * resolves the track's SCid and pays the 70/30 OGUN split (creator/listener).
 * SoundChain is a publishing house — every IPFS play is a tracked stream, so
 * mint plays reward creators exactly like soundchain.io.
 *
 * Dedupe: at most one log per trackId per minDuration window (loops still count).
 */
import { useRef, useCallback } from 'react'
import { useAccount } from 'wagmi'

interface StreamLogOptions {
  minDuration?: number
  onReward?: (reward: number, trackTitle?: string) => void          // listener earned
  onCreatorReward?: (reward: number, trackTitle?: string) => void   // creator earned
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

  const lastLogged = useRef<Map<string, number>>(new Map())
  const inFlight = useRef<Set<string>>(new Set())

  const logIfQualified = useCallback(
    async (trackId: string, duration: number) => {
      if (!trackId || duration < minDuration) return null
      // Skip synthetic ids that have no SCid (raw on-chain / version-prefixed cards)
      if (trackId.startsWith('onchain-') || /^v[12]-/.test(trackId)) return null

      const now = Date.now()
      const last = lastLogged.current.get(trackId)
      if (last && now - last < minDuration * 1000) return null
      if (inFlight.current.has(trackId)) return null
      inFlight.current.add(trackId)

      try {
        const res = await fetch('/api/log-stream', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            trackId,
            duration: Math.floor(duration),
            listenerWallet: address || undefined,
          }),
        })
        if (!res.ok) return null
        const data = (await res.json()) as LogStreamResult
        if (!data.success) return null

        lastLogged.current.set(trackId, now)
        if (data.creatorReward > 0) onCreatorReward?.(data.creatorReward, data.trackTitle)
        if (data.listenerReward > 0) onReward?.(data.listenerReward, data.trackTitle)
        if (data.listenerDailyLimitReached) onListenerLimitReached?.()
        return data
      } catch {
        return null
      } finally {
        inFlight.current.delete(trackId)
      }
    },
    [address, minDuration, onReward, onCreatorReward, onListenerLimitReached]
  )

  return { logIfQualified }
}
