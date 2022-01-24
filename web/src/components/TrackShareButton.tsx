import { Menu } from '@headlessui/react';
import { ShareIcon } from '@heroicons/react/outline';
import { useModalDispatch } from 'contexts/providers/modal';
import { toast } from 'react-toastify';

type Props = {
  trackId: string;
  title?: string | null;
  artist?: string | null;
  position?: 'top-right';
};

export const TrackShareButton = ({ trackId, title, artist, position }: Props) => {
  const { dispatchShowPostModal, dispatchShowAudioPlayerModal } = useModalDispatch();

  const handleSharing = async () => {
    const url = `${window.location.origin}/tracks/${trackId}`;

    try {
      await navigator
        .share({
          title: `SoundChain`,
          text: `Listen to this SoundChain track: ${title} - ${artist}`,
          url,
        })
        .catch(error => {
          if (!error.toString().includes('AbortError')) {
            toast('URL copied to clipboard');
          }
        });
    } catch {
      await navigator.clipboard.writeText(url);
      toast('URL copied to clipboard');
    }
  };

  const handlePost = () => {
    dispatchShowAudioPlayerModal(false);
    dispatchShowPostModal(true, trackId);
  };

  return (
    <div className="relative flex items-center">
      <Menu>
        <Menu.Button aria-label="Share">
          <div className="flex items-center text-gray-80">
            <ShareIcon width={20} height={20} />
          </div>
        </Menu.Button>
        <Menu.Items
          className={`absolute ${getPosition(
            position,
          )} z-40 bg-gray-20 text-white w-48 flex flex-col rounded-lg shadow-lg`}
        >
          <Menu.Item onClick={handleSharing}>
            <div className="w-full text-left p-5">Share URL</div>
          </Menu.Item>
          <Menu.Item onClick={handlePost}>
            <div className="w-full text-left p-5">Share as Post</div>
          </Menu.Item>
        </Menu.Items>
      </Menu>
    </div>
  );
};

const getPosition = (position: Props['position']) => {
  switch (position) {
    case 'top-right':
      return 'bottom-5 left-5';
    default:
      return 'top-8 right-0';
  }
};
