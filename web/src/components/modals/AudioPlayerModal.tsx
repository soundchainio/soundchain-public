import { ViewListIcon, VolumeOffIcon, VolumeUpIcon } from '@heroicons/react/solid';
import Slider from '@reach/slider';
import Asset from 'components/Asset';
import { Modal } from 'components/Modal';
import { TrackListItem } from 'components/TrackListItem';
import { TrackShareButton } from 'components/TrackShareButton';
import { useModalDispatch, useModalState } from 'contexts/providers/modal';
import { useAudioPlayerContext } from 'hooks/useAudioPlayer';
import { DownArrow } from 'icons/DownArrow';
import { Forward } from 'icons/ForwardButton';
import { HeartBorder } from 'icons/HeartBorder';
import { HeartFull } from 'icons/HeartFull';
import { Info } from 'icons/Info';
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
    volume,
    playlist,
    togglePlay,
    setProgressStateFromSlider,
    setVolume,
    playPrevious,
    playNext,
    jumpTo,
  } = useAudioPlayerContext();
  const [showTotalPlaybackDuration, setShowTotalPlaybackDuration] = useState(true);
  const [isFavorite, setIsFavorite] = useState(currentSong.isFavorite);
  const [isPlaylistOpen, setIsPlaylistOpen] = useState(false);

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
      leftButton={
        <div className="flex justify-start ml-6">
          <button aria-label="Close" className="w-10 h-10 flex justify-center items-center" onClick={handleClose}>
            <DownArrow />
          </button>
        </div>
      }
      onClose={handleClose}
    >
      <div className="flex flex-col h-full justify-center items-center text-white">
        <div className="w-full sm:max-w-xs px-8 sm:px-0">
          <div className={isPlaylistOpen ? 'flex items-center gap-4' : 'block'}>
            <div className="flex justify-center">
              <div
                className={
                  isPlaylistOpen
                    ? 'relative w-10 h-10 rounded-lg overflow-hidden'
                    : 'relative w-3/4 max-h-80 sm:w-full after:block after:pb-full flex bg-gray-80 rounded-lg overflow-hidden'
                }
              >
                <Asset src={currentSong.art} />
              </div>
            </div>
            <div className="flex justify-between my-4 w-full">
              <div className="flex w-full gap-4">
                <NextLink href={`/tracks/${currentSong.trackId}`}>
                  <a className="flex flex-col flex-1 min-w-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <h2 className="font-black truncate">{currentSong.title || 'Unknown title'}</h2>
                      <Info className="flex-shrink-0" />
                    </div>
                    <h3 className="font-medium">{currentSong.artist || 'Unknown artist'}</h3>
                  </a>
                </NextLink>
                <button className="flex items-center" onClick={handleFavorite}>
                  {isFavorite && <HeartFull />}
                  {!isFavorite && <HeartBorder />}
                </button>
              </div>
            </div>
          </div>
          <div className={isPlaylistOpen ? 'visible mb-5' : 'hidden'}>
            <div>Playlist</div>
            <div className="max-h-56 overflow-y-auto">
              {playlist.map((song, idx) => (
                <div key={song.trackId} className="md:pr-2">
                  <TrackListItem
                    variant="playlist"
                    index={idx + 1}
                    song={song}
                    handleOnPlayClicked={() => jumpTo(idx)}
                  />
                </div>
              ))}
            </div>
          </div>
          <Slider className="audio-player" min={0} max={duration} value={progress} onChange={onSliderChange} />
          <div className="flex justify-between mt-2 text-xs text-gray-80 cursor-default">
            <div>{timeFromSecs(progress || 0)}</div>
            <div onClick={onPlaybackDurationClick}>
              {showTotalPlaybackDuration ? timeFromSecs(duration || 0) : remainingTime(progress, duration || 0)}
            </div>
          </div>
          <div className="flex justify-between items-center mt-8">
            <TrackShareButton
              trackId={currentSong.trackId}
              title={currentSong.title}
              artist={currentSong.artist}
              position="top-right"
            />
            <div className="flex justify-center gap-4">
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
            <button className="w-5 text-gray-80" onClick={() => setIsPlaylistOpen(isOpen => !isOpen)}>
              <ViewListIcon />
            </button>
          </div>
          <div className="hidden md:flex items-center gap-4 pt-8">
            <VolumeOffIcon width={16} viewBox="-8 0 20 20" />
            <div className="flex-1">
              <Slider
                className="volume-slider"
                min={0}
                max={1}
                value={volume}
                onChange={value => setVolume(value)}
                step={0.1}
              />
            </div>
            <VolumeUpIcon width={16} />
          </div>
          <div className="py-4 flex justify-center"></div>
        </div>
      </div>
    </Modal>
  );
};
