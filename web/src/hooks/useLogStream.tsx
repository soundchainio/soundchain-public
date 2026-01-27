/**
 * useLogStream Hook - WIN-WIN MODEL!
 *
 * Logs track streams to earn OGUN rewards for BOTH creators AND listeners!
 *
 * WIN-WIN Rewards:
 * - NFT mints: 0.5 OGUN per stream (70% creator, 30% listener)
 * - Non-NFT mints: 0.05 OGUN per stream (70% creator, 30% listener)
 * - Creator max: 100 OGUN per track per day
 * - Listener max: 50 OGUN per day total
 * - Minimum 30 seconds playback to qualify as a stream
 */

import { gql, useMutation, useLazyQuery } from '@apollo/client'
import { useCallback, useRef, useState } from 'react'

// GraphQL mutation to log a stream - WIN-WIN returns both rewards!
const LOG_STREAM_MUTATION = gql`
  mutation LogStream($input: LogStreamInput!) {
    logStream(input: $input) {
      success
      totalStreams
      creatorReward
      listenerReward
      creatorDailyLimitReached
      listenerDailyLimitReached
      trackTitle
    }
  }
`

// GraphQL query to get SCid for a track
const GET_SCID_BY_TRACK_QUERY = gql`
  query GetScidByTrack($trackId: String!) {
    scidByTrack(trackId: $trackId) {
      id
      scid
      trackId
      streamCount
      ogunRewardsEarned
    }
  }
`

interface LogStreamInput {
  scid: string
  duration: number
  listenerWallet?: string
  listenerProfileId?: string
}

// WIN-WIN Result - both creator and listener earn!
interface LogStreamResult {
  success: boolean
  totalStreams: number
  // Creator rewards
  creatorReward: number
  creatorDailyLimitReached?: boolean
  // Listener rewards (WIN-WIN!)
  listenerReward: number
  listenerDailyLimitReached?: boolean
  // Track info
  trackTitle?: string
  // Legacy compatibility
  ogunReward?: number
  dailyLimitReached?: boolean
}

interface SCidData {
  id: string
  scid: string
  trackId: string
  streamCount: number
  ogunRewardsEarned: number
}

interface UseLogStreamOptions {
  minDuration?: number // Minimum seconds to qualify as stream (default 30)
  onReward?: (reward: number, trackTitle?: string) => void // Callback when listener earns OGUN (WIN!)
  onCreatorReward?: (reward: number, trackTitle?: string) => void // Callback when creator earns (for their own tracks)
  onDailyLimitReached?: () => void // Callback when listener daily limit hit
}

// Cache SCid lookups to avoid repeated queries
const scidCache = new Map<string, string>()

export function useLogStream(options: UseLogStreamOptions = {}) {
  const { minDuration = 30, onReward, onCreatorReward, onDailyLimitReached } = options

  const [isLogging, setIsLogging] = useState(false)
  const [lastReward, setLastReward] = useState<number | null>(null)
  const [lastCreatorReward, setLastCreatorReward] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Track last log timestamp per track (prevent rapid-fire duplicates, allow legitimate loops)
  const lastLogTime = useRef<Map<string, number>>(new Map())
  const playStartTimes = useRef<Map<string, number>>(new Map())

  const [logStreamMutation] = useMutation(LOG_STREAM_MUTATION)
  const [getScidByTrack] = useLazyQuery(GET_SCID_BY_TRACK_QUERY)

  /**
   * Get SCid for a track (with caching)
   */
  const getScidForTrack = useCallback(async (trackId: string): Promise<string | null> => {
    // Check cache first
    if (scidCache.has(trackId)) {
      return scidCache.get(trackId) || null
    }

    try {
      const { data } = await getScidByTrack({ variables: { trackId } })
      const scid = data?.scidByTrack?.scid
      if (scid) {
        scidCache.set(trackId, scid)
        return scid
      }
    } catch (err) {
      console.warn('[useLogStream] Failed to get SCid for track:', trackId, err)
    }

    return null
  }, [getScidByTrack])

  /**
   * Start tracking playback time for a track
   */
  const startTracking = useCallback((trackId: string) => {
    playStartTimes.current.set(trackId, Date.now())
  }, [])

  /**
   * Stop tracking and get elapsed time in seconds
   */
  const stopTracking = useCallback((trackId: string): number => {
    const startTime = playStartTimes.current.get(trackId)
    if (!startTime) return 0

    playStartTimes.current.delete(trackId)
    return Math.floor((Date.now() - startTime) / 1000)
  }, [])

  /**
   * Log a stream for a track
   *
   * Call this when a track finishes playing or after minimum duration
   */
  const logStream = useCallback(async (
    trackId: string,
    duration: number,
    listenerWallet?: string
  ): Promise<LogStreamResult | null> => {
    // Check minimum duration
    if (duration < minDuration) {
      console.log(`[useLogStream] Duration ${duration}s < ${minDuration}s minimum, skipping`)
      return null
    }

    // Allow stream every 30 seconds of play time per track (not per-minute window)
    const now = Date.now()
    const lastLog = lastLogTime.current.get(trackId)
    if (lastLog && (now - lastLog) < (minDuration * 1000)) {
      console.log(`[useLogStream] Track logged ${Math.floor((now - lastLog) / 1000)}s ago, need ${minDuration}s between logs`)
      return null
    }

    setIsLogging(true)
    setError(null)

    try {
      // Get SCid for track
      const scid = await getScidForTrack(trackId)
      if (!scid) {
        console.log('[useLogStream] No SCid found for track:', trackId)
        setError('Track does not have an SCid registered')
        return null
      }

      // Log the stream
      const { data } = await logStreamMutation({
        variables: {
          input: {
            scid,
            duration: Math.floor(duration),
            listenerWallet,
          }
        }
      })

      const result = data?.logStream as LogStreamResult

      if (result?.success) {
        // Mark log timestamp for this track
        lastLogTime.current.set(trackId, Date.now())

        // WIN-WIN: Update rewards for BOTH listener and creator
        const listenerReward = result.listenerReward || 0
        const creatorReward = result.creatorReward || 0
        const totalReward = listenerReward + creatorReward

        setLastReward(listenerReward)
        setLastCreatorReward(creatorReward)

        // Legacy compatibility
        result.ogunReward = totalReward
        result.dailyLimitReached = result.listenerDailyLimitReached

        // WIN-WIN Callbacks - Listener earned OGUN!
        if (listenerReward > 0 && onReward) {
          onReward(listenerReward, result.trackTitle)
        }

        // Creator earned OGUN (for tracking if user is also the creator)
        if (creatorReward > 0 && onCreatorReward) {
          onCreatorReward(creatorReward, result.trackTitle)
        }

        // Daily limit reached for listener
        if (result.listenerDailyLimitReached && onDailyLimitReached) {
          onDailyLimitReached()
        }

        console.log(`[useLogStream] WIN-WIN Stream: Listener=${listenerReward.toFixed(4)} OGUN, Creator=${creatorReward.toFixed(4)} OGUN, Track="${result.trackTitle}"`)
      }

      return result

    } catch (err: any) {
      console.error('[useLogStream] Error logging stream:', err)
      setError(err.message || 'Failed to log stream')
      return null
    } finally {
      setIsLogging(false)
    }
  }, [minDuration, getScidForTrack, logStreamMutation, onReward, onCreatorReward, onDailyLimitReached])

  /**
   * Log stream when track ends (convenience method)
   *
   * Uses tracked play time if startTracking was called
   */
  const logStreamOnEnd = useCallback(async (
    trackId: string,
    listenerWallet?: string
  ): Promise<LogStreamResult | null> => {
    const duration = stopTracking(trackId)
    return logStream(trackId, duration, listenerWallet)
  }, [stopTracking, logStream])

  /**
   * Reset session (clear logged tracks cache)
   */
  const resetSession = useCallback(() => {
    lastLogTime.current.clear()
    playStartTimes.current.clear()
  }, [])

  return {
    logStream,
    logStreamOnEnd,
    startTracking,
    stopTracking,
    resetSession,
    isLogging,
    lastReward,           // Listener's reward (WIN-WIN!)
    lastCreatorReward,    // Creator's reward
    error,
    getScidForTrack,
  }
}

export default useLogStream
