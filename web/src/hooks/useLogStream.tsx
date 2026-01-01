/**
 * useLogStream Hook
 *
 * Logs track streams to earn OGUN rewards.
 *
 * Tiered rewards:
 * - NFT mints (with tokenId): 0.5 OGUN per stream
 * - Non-NFT mints: 0.05 OGUN per stream
 * - Max 100 OGUN per track per day (anti-bot farming)
 * - Minimum 30 seconds playback to qualify as a stream
 */

import { gql, useMutation, useLazyQuery } from '@apollo/client'
import { useCallback, useRef, useState } from 'react'

// GraphQL mutation to log a stream
const LOG_STREAM_MUTATION = gql`
  mutation LogStream($input: LogStreamInput!) {
    logStream(input: $input) {
      success
      ogunReward
      totalStreams
      dailyLimitReached
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
}

interface LogStreamResult {
  success: boolean
  ogunReward: number
  totalStreams: number
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
  onReward?: (reward: number) => void // Callback when OGUN is earned
  onDailyLimitReached?: () => void // Callback when daily limit hit
}

// Cache SCid lookups to avoid repeated queries
const scidCache = new Map<string, string>()

export function useLogStream(options: UseLogStreamOptions = {}) {
  const { minDuration = 30, onReward, onDailyLimitReached } = options

  const [isLogging, setIsLogging] = useState(false)
  const [lastReward, setLastReward] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Track which tracks we've already logged this session (prevent duplicates)
  const loggedTracks = useRef<Set<string>>(new Set())
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

    // Prevent duplicate logs for same track in same session
    const sessionKey = `${trackId}-${Math.floor(Date.now() / 60000)}` // Key per minute
    if (loggedTracks.current.has(sessionKey)) {
      console.log('[useLogStream] Already logged this track recently, skipping')
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
        // Mark as logged
        loggedTracks.current.add(sessionKey)

        // Update last reward
        setLastReward(result.ogunReward)

        // Callbacks
        if (result.ogunReward > 0 && onReward) {
          onReward(result.ogunReward)
        }
        if (result.dailyLimitReached && onDailyLimitReached) {
          onDailyLimitReached()
        }

        console.log(`[useLogStream] Logged stream: ${result.ogunReward} OGUN earned (total: ${result.totalStreams} streams)`)
      }

      return result

    } catch (err: any) {
      console.error('[useLogStream] Error logging stream:', err)
      setError(err.message || 'Failed to log stream')
      return null
    } finally {
      setIsLogging(false)
    }
  }, [minDuration, getScidForTrack, logStreamMutation, onReward, onDailyLimitReached])

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
    loggedTracks.current.clear()
    playStartTimes.current.clear()
  }, [])

  return {
    logStream,
    logStreamOnEnd,
    startTracking,
    stopTracking,
    resetSession,
    isLogging,
    lastReward,
    error,
    getScidForTrack,
  }
}

export default useLogStream
