import Slider from '@reach/slider';
import { Modal } from 'components/Modal';
import { useModalDispatch, useModalState } from 'contexts/providers/modal';
import { useAudioPlayerContext } from 'hooks/useAudioPlayer';
import { DownArrow } from 'icons/DownArrow';
import { Forward } from 'icons/ForwardButton';
import { Play } from 'icons/PlayModal';
import { Rewind } from 'icons/RewindButton';
import Image from 'next/image';
import { remainingTime, timeFromSecs } from 'utils/calculateTime';

export const AudioPlayerModal = () => {
  const modalState = useModalState();
  const { dispatchShowAudioPlayerModal } = useModalDispatch();
  const { play, currentSong, isPlaying } = useAudioPlayerContext();

  const isOpen = modalState.showAudioPlayer;

  const handleClose = () => {
    dispatchShowAudioPlayerModal(false);
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
            {currentSong.art && <Image src={currentSong.art} alt="" layout="fill" className="m-auto object-cover" />}
          </div>
          <div className="flex flex-col gap-1 mt-7 mb-4">
            <h2 className="font-black">Track Title</h2>
            <h3 className="font-medium">Artist</h3>
          </div>
          <Slider min={0} max={100} value={50} />
          <div className="flex mt-2 text-xs text-gray-80">
            <div className="flex-1">{timeFromSecs(100 || 0)}</div>
            <div className="flex-1 text-right">{remainingTime(100, 200 || 0)} </div>
          </div>
          <div className="flex justify-evenly mt-8">
            <button className="rounded-full w-12 h-12 flex justify-center items-center">
              <Rewind />
            </button>
            <button className="bg-white rounded-full w-12 h-12 flex justify-center items-center">
              <Play />
            </button>
            <button className="rounded-full w-12 h-12 flex justify-center items-center">
              <Forward />
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
