import { useState, useEffect, useRef, useCallback } from 'react'
import { Coins, CheckCircle, Loader2 } from 'lucide-react'
import { gql, useMutation } from '@apollo/client'
import { useMe } from 'hooks/useMe'
import { toast } from 'react-toastify'

// GraphQL mutation for recording watch time
const RECORD_STORY_WATCH = gql`
  mutation recordStoryWatch(
    $storyId: String!
    $watchDurationSeconds: Float!
    $viewerProfileId: String
    $viewerWalletAddress: String
  ) {
    recordStoryWatch(
      storyId: $storyId
      watchDurationSeconds: $watchDurationSeconds
      viewerProfileId: $viewerProfileId
      viewerWalletAddress: $viewerWalletAddress
    ) {
      qualified
      viewerScid
    }
  }
`

const MINIMUM_WATCH_SECONDS = 30

interface ReelSCidTrackerProps {
  storyId: string
  isPermanent: boolean
  isScidEligible: boolean
  isPaused: boolean
  onQualified?: (scid: string) => void
}

export const ReelSCidTracker = ({
  storyId,
  isPermanent,
  isScidEligible,
  isPaused,
  onQualified,
}: ReelSCidTrackerProps) => {
  // useMe() returns the User object directly, not { me: User }
  const me = useMe()
  const profileId = me?.profile?.id
  const walletAddress = me?.magicWalletAddress || me?.googleWalletAddress

  const [watchSeconds, setWatchSeconds] = useState(0)
  const [hasQualified, setHasQualified] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [showReward, setShowReward] = useState(false)
  const [earnedScid, setEarnedScid] = useState<string | null>(null)

  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const hasRecordedRef = useRef(false)

  const [recordStoryWatch] = useMutation(RECORD_STORY_WATCH, {
    onError: (error) => {
      console.error('[ReelSCidTracker] Error recording watch:', error)
    },
  })

  // Calculate progress percentage
  const progressPercent = Math.min((watchSeconds / MINIMUM_WATCH_SECONDS) * 100, 100)
  const isTrackingEnabled = isPermanent && isScidEligible

  // Track watch time
  useEffect(() => {
    if (!isTrackingEnabled || isPaused || hasQualified) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      return
    }

    intervalRef.current = setInterval(() => {
      setWatchSeconds(prev => {
        const newSeconds = prev + 1
        return newSeconds
      })
    }, 1000)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [isTrackingEnabled, isPaused, hasQualified])

  // Check for qualification and record watch
  const recordWatch = useCallback(async () => {
    if (hasRecordedRef.current || !isTrackingEnabled) return

    hasRecordedRef.current = true
    setIsRecording(true)

    try {
      const { data } = await recordStoryWatch({
        variables: {
          storyId,
          watchDurationSeconds: watchSeconds,
          viewerProfileId: profileId || null,
          viewerWalletAddress: walletAddress || null,
        },
      })

      if (data?.recordStoryWatch?.qualified) {
        setHasQualified(true)
        setShowReward(true)
        setEarnedScid(data.recordStoryWatch.viewerScid)

        if (data.recordStoryWatch.viewerScid) {
          onQualified?.(data.recordStoryWatch.viewerScid)
          toast.success('SCID reward earned!', {
            icon: '🎉',
            autoClose: 3000,
          })
        }

        // Hide reward animation after 3 seconds
        setTimeout(() => setShowReward(false), 3000)
      }
    } catch (error) {
      console.error('[ReelSCidTracker] Failed to record watch:', error)
      hasRecordedRef.current = false // Allow retry
    } finally {
      setIsRecording(false)
    }
  }, [storyId, watchSeconds, profileId, walletAddress, isTrackingEnabled, recordStoryWatch, onQualified])

  // Trigger recording when threshold is reached
  useEffect(() => {
    if (watchSeconds >= MINIMUM_WATCH_SECONDS && !hasQualified && !hasRecordedRef.current) {
      recordWatch()
    }
  }, [watchSeconds, hasQualified, recordWatch])

  // Reset when story changes
  useEffect(() => {
    setWatchSeconds(0)
    setHasQualified(false)
    setShowReward(false)
    setEarnedScid(null)
    hasRecordedRef.current = false
  }, [storyId])

  // Don't render if not tracking
  if (!isTrackingEnabled) {
    return null
  }

  return (
    <>
      {/* Progress indicator - bottom of screen */}
      <div className="absolute bottom-24 left-4 right-4 z-30">
        <div className="flex items-center gap-3 p-2 rounded-lg bg-black/40 backdrop-blur-sm">
          {/* SCID icon */}
          <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
            hasQualified
              ? 'bg-gradient-to-r from-purple-500 to-cyan-500'
              : 'bg-neutral-800'
          }`}>
            {isRecording ? (
              <Loader2 className="w-4 h-4 text-white animate-spin" />
            ) : hasQualified ? (
              <CheckCircle className="w-4 h-4 text-white" />
            ) : (
              <Coins className="w-4 h-4 text-purple-400" />
            )}
          </div>

          {/* Progress info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <span className="text-white text-xs font-medium">
                {hasQualified ? 'SCID Earned!' : 'SCID Reward'}
              </span>
              <span className="text-neutral-400 text-[10px]">
                {hasQualified ? '✓ Qualified' : `${Math.floor(watchSeconds)}s / ${MINIMUM_WATCH_SECONDS}s`}
              </span>
            </div>

            {/* Progress bar */}
            <div className="h-1 bg-neutral-700 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-300 rounded-full ${
                  hasQualified
                    ? 'bg-gradient-to-r from-purple-500 to-cyan-500'
                    : 'bg-purple-500'
                }`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Reward celebration animation */}
      {showReward && (
        <div className="absolute inset-0 z-40 flex items-center justify-center pointer-events-none animate-in zoom-in-50 duration-500">
          <div className="flex flex-col items-center gap-3 p-6 rounded-2xl bg-gradient-to-br from-purple-500/90 to-cyan-500/90 backdrop-blur-md shadow-2xl">
            <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center animate-bounce">
              <Coins className="w-8 h-8 text-white" />
            </div>
            <div className="text-center">
              <p className="text-white text-lg font-bold">SCID Earned!</p>
              <p className="text-white/80 text-sm">Streaming rewards unlocked</p>
              {earnedScid && (
                <p className="text-white/60 text-[10px] mt-1 font-mono">{earnedScid}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default ReelSCidTracker
