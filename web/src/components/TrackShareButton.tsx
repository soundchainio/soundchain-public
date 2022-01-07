import { Menu } from '@headlessui/react';
import { useModalDispatch } from 'contexts/providers/modal';
import { Share } from 'icons/Share';
import { toast } from 'react-toastify';

type Props = {
  trackId: string;
  title?: string | null;
  artist?: string | null;
};

export const TrackShareButton = ({ trackId, title, artist }: Props) => {
  const { dispatchShowPostModal, dispatchShowAudioPlayerModal } = useModalDispatch();

  const handleSharing = async () => {
    const url = `${window.location.origin}/tracks/${trackId}`;

    try {
      await navigator.share({
        title: `SoundChain`,
        text: `Listen to this SoundChain track: ${title} - ${artist}`,
        url,
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
    <div className="relative">
      <Menu>
        <Menu.Button>
          <button className="flex justify-center items-center gap-1 text-gray-80 text-xs font-black border-gray-80 border-2 rounded py-1 px-2">
            <Share />
            Share
          </button>
        </Menu.Button>
        <Menu.Items className="absolute z-40 bg-gray-20 text-white w-48 flex flex-col right-0 rounded-lg shadow-lg">
          <Menu.Item>
            <button onClick={handleSharing} className="w-full text-left p-5">
              Share URL
            </button>
          </Menu.Item>
          <Menu.Item>
            <button onClick={handlePost} className="w-full text-left p-5">
              Share as Post
            </button>
          </Menu.Item>
        </Menu.Items>
      </Menu>
    </div>
  );
};
