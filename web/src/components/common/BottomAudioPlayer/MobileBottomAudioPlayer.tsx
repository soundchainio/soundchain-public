import { useModalDispatch } from 'contexts/ModalContext'
import { useAudioPlayerContext } from 'hooks/useAudioPlayer'
import { Pause } from 'icons/PauseBottomAudioPlayer'
import { Play } from 'icons/PlayBottomAudioPlayer'
import Asset from 'components/Asset/Asset'
import { FavoriteTrack } from 'components/common/Buttons/FavoriteTrack/FavoriteTrack'
import { XMarkIcon } from '@heroicons/react/24/outline'

// Gradient progress bar component
const GradientProgressBar = ({ progress, duration }: { progress: number; duration: number }) => {
  const percentage = duration > 0 ? (progress / duration) * 100 : 0

  return (
    <div className="absolute top-0 left-0 right-0 h-1 bg-neutral-800/50">
      <div
        className="h-full transition-all duration-100"
        style={{
          width: `${percentage}%`,
          background: 'linear-gradient(90deg, #26D1A8 0%, #62AAFF 25%, #AC4EFD 50%, #F1419E 75%, #FED503 100%)',
        }}
      />
    </div>
  )
}

/**
 * MobileBottomAudioPlayer - UI only, no audio element
 * Audio is handled by AudioEngine component to prevent echo
 *
 * Features:
 * - Tap anywhere on cover art/title area to open fullscreen player
 * - Close (X) button to dismiss the player entirely
 * - Play/pause and favorite buttons on the right
 */
export const BottomAudioPlayer = () => {
  const {
    currentSong,
    isPlaying,
    togglePlay,
    closePlayer,
    progress,
    duration,
  } = useAudioPlayerContext()

  const { dispatchShowAudioPlayerModal } = useModalDispatch()

  if (!currentSong.src) {
    return null
  }

  // Tap anywhere on the player (except buttons) to open fullscreen
  const handleOpenFullscreen = () => {
    dispatchShowAudioPlayerModal(true, true) // Open directly in fullscreen mode
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden flex flex-col bg-neutral-900 py-2 px-4 pb-safe pl-safe pr-safe animate-slide-up shadow-[0_-4px_20px_rgba(0,0,0,0.5)] box-border">
      {/* Gradient progress bar at top */}
      <GradientProgressBar progress={progress} duration={duration} />

      <div className="flex items-center justify-between gap-3 w-full mt-1">
        {/* Close button (X) on the left */}
        <button
          aria-label="Close player"
          className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 active:bg-white/20 flex-shrink-0"
          onClick={closePlayer}
        >
          <XMarkIcon className="h-4 w-4 text-white" />
        </button>

        {/* Tappable area - opens fullscreen player */}
        <button
          className="flex min-w-0 flex-1 items-center gap-3 overflow-hidden"
          aria-label="Open fullscreen player"
          onClick={handleOpenFullscreen}
        >
          <div className="relative flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden bg-gray-800">
            <Asset src={currentSong.art} sizes="48px" />
          </div>
          <div className="flex flex-col items-start min-w-0 flex-1 overflow-hidden">
            <h2 className="text-sm font-bold text-white truncate w-full">{currentSong.title || 'Unknown title'}</h2>
            <p className="text-xs text-gray-400 truncate w-full">{currentSong.artist || 'Unknown artist'}</p>
          </div>
        </button>

        {/* Action buttons on the right */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <FavoriteTrack />
          <button
            aria-label={isPlaying ? 'Pause' : 'Play'}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 active:bg-white/20"
            onClick={togglePlay}
          >
            {isPlaying ? <Pause /> : <Play />}
          </button>
        </div>
      </div>
    </div>
  )
}

export default BottomAudioPlayer
