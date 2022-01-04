import { Share } from 'icons/Share';
import { toast } from 'react-toastify';

type Props = {
  trackId: string;
  title?: string | null;
  artist?: string | null;
};

export const TrackShareButton = ({ trackId, title, artist }: Props) => {
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

  return (
    <div className="flex justify-end">
      <button
        className="flex justify-center items-center gap-1 text-gray-80 text-xs font-black border-gray-80 border-2 rounded py-1 px-2"
        onClick={handleSharing}
      >
        <Share />
        Share
      </button>
    </div>
  );
};
