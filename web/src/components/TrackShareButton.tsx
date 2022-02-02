import { Menu, Transition } from '@headlessui/react';
import { ShareIcon } from '@heroicons/react/outline';
import { useModalDispatch } from 'contexts/providers/modal';
import { Fragment } from 'react';
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
        <Menu.Button aria-label="Share" className="w-10 h-10 flex items-center justify-center text-gray-80">
          <ShareIcon width={18} height={18} />
        </Menu.Button>
        <Transition
          as={Fragment}
          enter="transition ease-out duration-100"
          enterFrom="transform opacity-0 scale-95"
          enterTo="transform opacity-100 scale-100"
          leave="transition ease-in duration-75"
          leaveFrom="transform opacity-100 scale-100"
          leaveTo="transform opacity-0 scale-95"
        >
          <Menu.Items
            className={`absolute ${getPosition(
              position,
            )} z-40 bg-gray-20 text-white w-32 flex flex-col rounded-lg shadow-lg`}
          >
            <Menu.Item>
              {({ active }) => (
                <button
                  className={`w-full text-left font-semibold text-xs px-5 py-4 ${active && 'bg-gray-40 rounded-md'}`}
                  onClick={handleSharing}
                >
                  Share URL
                </button>
              )}
            </Menu.Item>
            <Menu.Item>
              {({ active }) => (
                <button
                  className={`w-full text-left font-semibold text-xs px-5 py-4 ${active && 'bg-gray-40 rounded-md'}`}
                  onClick={handlePost}
                >
                  Share as Post
                </button>
              )}
            </Menu.Item>
          </Menu.Items>
        </Transition>
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
