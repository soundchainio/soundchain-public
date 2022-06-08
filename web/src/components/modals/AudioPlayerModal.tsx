import Asset from 'components/Asset';
import { Modal } from 'components/Modal';
import { TrackListItem } from 'components/TrackListItem';
import { TrackShareButton } from 'components/TrackShareButton';
import { useModalDispatch, useModalState } from 'contexts/providers/modal';
import { useAudioPlayerContext } from 'hooks/useAudioPlayer';
import { useMe } from 'hooks/useMe';
import { DownArrow } from 'icons/DownArrow';
import { HeartBorder } from 'icons/HeartBorder';
import { HeartFull } from 'icons/HeartFull';
import { Info } from 'icons/Info';
import { TrackDocument, useToggleFavoriteMutation } from 'lib/graphql';
import NextLink from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';

export const AudioPlayerModal = () => {
  const router = useRouter();
  const modalState = useModalState();
  const [toggleFavorite] = useToggleFavoriteMutation();
  const { dispatchShowAudioPlayerModal } = useModalDispatch();
  const {
    currentSong,
    playlist,
    jumpTo,
  } = useAudioPlayerContext();
  const [isFavorite, setIsFavorite] = useState(currentSong.isFavorite);
  const me = useMe();

  const isOpen = modalState.showAudioPlayer;

  const handleClose = () => {
    dispatchShowAudioPlayerModal(false);
  };

  const handleFavorite = async () => {
    if (me?.profile.id) {
      await toggleFavorite({ variables: { trackId: currentSong.trackId }, refetchQueries: [TrackDocument] });
      setIsFavorite(!isFavorite);
    } else {
      router.push('/login');
    }
  };

  useEffect(() => {
    handleClose();
  }, [router.asPath]);

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
      rightButton={
        <div className="flex justify-end mr-6">
          <TrackShareButton trackId={currentSong.trackId} title={currentSong.title} artist={currentSong.artist} />
        </div>
      }
      onClose={handleClose}
    >
      <div className="flex flex-col h-full items-center text-white">
        <div className="w-full h-full sm:max-w-xs px-8 sm:px-0">
          <div className="flex flex-col truncate justify-start">
            <div className='flex items-center gap-4'>
              <div className="flex justify-center">
                <div className='relative w-10 h-10 rounded-lg overflow-hidden'>
                  <Asset src={currentSong.art} />
                </div>
              </div>
              <div className="flex justify-between my-4 w-full min-w-0">
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
            <div className='visible mb-5 overflow-y-auto'>
              <h2 className="text-sm font-bold">Playlist</h2>
              <div className="overflow-y-auto">
                {playlist.map((song, idx) => (
                  <div key={song.trackId} className="sm:pr-2">
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
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default AudioPlayerModal;
