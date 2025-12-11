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
    <div className="fixed bottom-0 left-0 right-0 z-50 flex flex-col gap-2 bg-neutral-900 py-2 animate-slide-up shadow-[0_-4px_20px_rgba(0,0,0,0.5)]">
      <div className="flex items-center justify-between px-2">
        <button
          className="flex min-w-0 flex-1 items-center gap-2"
          aria-label="Open audio player controls"
          onClick={() => dispatchShowAudioPlayerModal(true)}
        >
          <div className="relative flex h-12 w-12 flex-shrink-0 items-center bg-gray-80">
            <Asset src={currentSong.art} sizes="2.5rem" />
          </div>
          <div className="flex flex-col items-start gap-1 text-sm text-white">
            <h2 className="truncate font-black">{currentSong.title || 'Unknown title'}</h2>
            <p className="ml-[2px] truncate font-medium">{currentSong.artist || 'Unknown artist'}</p>
          </div>
        </button>
        <div className="flex items-center gap-2">
          <FavoriteTrack />
          <button
            aria-label={isPlaying ? 'Pause' : 'Play'}
            className="flex h-10 w-11 flex-shrink-0 items-center justify-center duration-75 hover:scale-125"
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
