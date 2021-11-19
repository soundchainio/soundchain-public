import Slider from '@reach/slider';
import Asset from 'components/Asset';
import { Modal } from 'components/Modal';
import { useModalDispatch, useModalState } from 'contexts/providers/modal';
import { useAudioPlayerContext } from 'hooks/useAudioPlayer';
import { DownArrow } from 'icons/DownArrow';
import { Forward } from 'icons/ForwardButton';
import { HeartBorder } from 'icons/HeartBorder';
import { HeartFull } from 'icons/HeartFull';
import { Pause } from 'icons/PauseBottomAudioPlayer';
import { Play } from 'icons/PlayBottomAudioPlayer';
import { Rewind } from 'icons/RewindButton';
import { TrackDocument, useToggleFavoriteMutation } from 'lib/graphql';
import NextLink from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { remainingTime, timeFromSecs } from 'utils/calculateTime';

export const AudioPlayerModal = () => {
  const { asPath } = useRouter();
  const modalState = useModalState();
  const [toggleFavorite] = useToggleFavoriteMutation();
  const { dispatchShowAudioPlayerModal } = useModalDispatch();
  const {
    currentSong,
    isPlaying,
    duration,
    progress,
    hasNext,
    togglePlay,
    setProgressStateFromSlider,
    playPrevious,
    playNext,
  } = useAudioPlayerContext();
  const [showTotalPlaybackDuration, setShowTotalPlaybackDuration] = useState(true);
  const [isFavorite, setIsFavorite] = useState(currentSong.isFavorite);

  const isOpen = modalState.showAudioPlayer;

  const handleClose = () => {
    dispatchShowAudioPlayerModal(false);
  };

  const onSliderChange = (value: number) => {
    setProgressStateFromSlider(value);
  };

  const onPlaybackDurationClick = () => {
    setShowTotalPlaybackDuration(!showTotalPlaybackDuration);
  };

  const handleFavorite = async () => {
    await toggleFavorite({ variables: { trackId: currentSong.trackId }, refetchQueries: [TrackDocument] });
    setIsFavorite(!isFavorite);
  };

  useEffect(() => {
    handleClose();
  }, [asPath]);

  useEffect(() => {
    setIsFavorite(currentSong.isFavorite);
  }, [currentSong]);

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
        <div className="w-full sm:max-w-xs px-8 sm:px-0">
          <div className="flex justify-center">
            <div className="relative w-3/4 max-h-80 sm:w-full after:block after:pb-full flex bg-gray-80 rounded-lg overflow-hidden">
              <Asset src={currentSong.art} />
            </div>
          </div>
          <div className="flex justify-between mt-7 mb-4 w-full cursor-pointer">
            <div className="flex w-full">
              <NextLink href={`/tracks/${currentSong.trackId}`}>
                <div className="flex flex-col flex-1 gap-1">
                  <h2 className="font-black">{currentSong.title || 'Unknown title'}</h2>
                  <h3 className="font-medium">{currentSong.artist || 'Unknown artist'}</h3>
                </div>
              </NextLink>
              <div className="flex items-center pl-4" onClick={handleFavorite}>
                {isFavorite && <HeartFull />}
                {!isFavorite && <HeartBorder />}
              </div>
            </div>
          </div>
          <Slider className="audio-player" min={0} max={duration} value={progress} onChange={onSliderChange} />
          <div className="flex justify-between mt-2 text-xs text-gray-80 cursor-default">
            <div>{timeFromSecs(progress || 0)}</div>
            <div onClick={onPlaybackDurationClick}>
              {showTotalPlaybackDuration ? timeFromSecs(duration || 0) : remainingTime(progress, duration || 0)}
            </div>
          </div>
          <div className="flex justify-center mt-8 gap-6">
            <button
              className={'rounded-full w-12 h-12 flex justify-center items-center'}
              aria-label="Previous track"
              onClick={playPrevious}
            >
              <Rewind className={'hover:fill-current active:text-gray-80'} />
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
              aria-label="Next track"
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
