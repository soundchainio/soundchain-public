import Slider from '@reach/slider';
import { Modal } from 'components/Modal';
import { useModalDispatch, useModalState } from 'contexts/providers/modal';
import { useAudioPlayerContext } from 'hooks/useAudioPlayer';
import { DownArrow } from 'icons/DownArrow';
import { Forward } from 'icons/ForwardButton';
import { Pause } from 'icons/PauseBottomAudioPlayer';
import { Play } from 'icons/PlayBottomAudioPlayer';
import { Rewind } from 'icons/RewindButton';
import Image from 'next/image';
import { remainingTime, timeFromSecs } from 'utils/calculateTime';

export const AudioPlayerModal = () => {
  const modalState = useModalState();
  const { dispatchShowAudioPlayerModal } = useModalDispatch();
  const {
    currentSong,
    isPlaying,
    duration,
    progress,
    hasPrevious,
    hasNext,
    togglePlay,
    setProgressStateFromSlider,
    playPrevious,
    playNext,
  } = useAudioPlayerContext();

  const isOpen = modalState.showAudioPlayer;

  const handleClose = () => {
    dispatchShowAudioPlayerModal(false);
  };

  const onSliderChange = (value: number) => {
    setProgressStateFromSlider(value);
  };

  return (
    <Modal
      show={isOpen}
      title={'Now Playing'}
      rightButton={
        <div className="flex justify-end mr-6">
          <button aria-label="Close" className="w-10 h-10 flex justify-center items-center" onClick={handleClose}>
            <DownArrow />
          </button>
        </div>
      }
      onClose={handleClose}
    >
      <div className="flex flex-col h-full justify-center items-center text-white">
        <div className="post-audio-player w-72">
          <div className="w-72 h-72 relative flex items-center bg-gray-80 rounded-lg overflow-hidden">
            {currentSong.art && (
              <Image src={currentSong.art} alt="" layout="fill" className="m-auto object-cover priority" />
            )}
          </div>
          <div className="flex flex-col gap-1 mt-7 mb-4">
            <h2 className="font-black">{currentSong.title || 'Unknown title'}</h2>
            <h3 className="font-medium">{currentSong.artist || 'Unknown artist'}</h3>
          </div>
          <Slider min={0} max={duration} value={progress} onChange={onSliderChange} />
          <div className="flex mt-2 text-xs text-gray-80">
            <div className="flex-1">{timeFromSecs(progress || 0)}</div>
            <div className="flex-1 text-right">{remainingTime(progress, duration || 0)} </div>
          </div>
          <div className="flex justify-evenly mt-8">
            <button
              className={`${!hasPrevious && 'cursor-default'} rounded-full w-12 h-12 flex justify-center items-center`}
              aria-label="Previous"
              onClick={playPrevious}
              disabled={!hasPrevious}
            >
              <Rewind className={`${hasPrevious && 'hover:fill-current'} active:text-gray-80`} />
            </button>
            <button
              className="bg-white rounded-full w-12 h-12 flex justify-center items-center hover:scale-110 active:scale-100"
              aria-label={isPlaying ? 'Pause' : 'Play'}
              onClick={togglePlay}
            >
              {isPlaying ? <Pause fill="black" /> : <Play fill="black" />}
            </button>
            <button
              className={`${!hasNext && 'cursor-default'} rounded-full w-12 h-12 flex justify-center items-center`}
              aria-label="Next"
              onClick={playNext}
              disabled={!hasNext}
            >
              <Forward className={`${hasNext && 'hover:fill-current'} active:text-gray-80`} />
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
