import { useModalDispatch } from 'contexts/ModalContext'
import { useAudioPlayerContext } from 'hooks/useAudioPlayer'
import { Pause } from 'icons/PauseBottomAudioPlayer'
import { Play } from 'icons/PlayBottomAudioPlayer'
import Asset from 'components/Asset/Asset'
import { FavoriteTrack } from 'components/common/Buttons/FavoriteTrack/FavoriteTrack'

/**
 * MobileBottomAudioPlayer - UI only, no audio element
 * Audio is handled by AudioEngine component to prevent echo
 */
export const BottomAudioPlayer = () => {
  const {
    currentSong,
    isPlaying,
    togglePlay,
  } = useAudioPlayerContext()

  const { dispatchShowAudioPlayerModal } = useModalDispatch()

  if (!currentSong.src) {
    return null
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden flex flex-col bg-neutral-900 py-2 px-3 animate-slide-up shadow-[0_-4px_20px_rgba(0,0,0,0.5)] safe-area-inset-bottom">
      <div className="flex items-center justify-between gap-2 w-full max-w-full overflow-hidden">
        <button
          className="flex min-w-0 flex-1 items-center gap-3 overflow-hidden"
          aria-label="Open audio player controls"
          onClick={() => dispatchShowAudioPlayerModal(true)}
        >
          <div className="relative flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden bg-gray-800">
            <Asset src={currentSong.art} sizes="48px" />
          </div>
          <div className="flex flex-col items-start min-w-0 flex-1 overflow-hidden">
            <h2 className="text-sm font-bold text-white truncate w-full">{currentSong.title || 'Unknown title'}</h2>
            <p className="text-xs text-gray-400 truncate w-full">{currentSong.artist || 'Unknown artist'}</p>
          </div>
        </button>
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
