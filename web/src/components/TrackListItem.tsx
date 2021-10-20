import { TrackSkeleton } from 'components/TrackSkeleton';
import { useAudioPlayerContext } from 'hooks/useAudioPlayer';
import { Pause } from 'icons/PauseBottomAudioPlayer';
import { Play } from 'icons/PlayBottomAudioPlayer';
import { useTrackLazyQuery } from 'lib/graphql';
import React, { useEffect } from 'react';
import Asset from './Asset';

type Song = {
  src: string;
  title?: string | null;
  trackId: string;
  artist?: string | null;
  art?: string | null;
};

interface TrackProps {
  trackId: string;
  index: number;
  coverPhotoUrl?: string;
  handleOnPlayClicked: (song: Song) => void;
}

export const TrackListItem = ({ trackId, index, coverPhotoUrl, handleOnPlayClicked }: TrackProps) => {
  const [track, { data }] = useTrackLazyQuery({ variables: { id: trackId } });
  const { isCurrentlyPlaying } = useAudioPlayerContext();
  const isPlaying = isCurrentlyPlaying(trackId);

  useEffect(() => {
    if (!data?.track) {
      track();
    }
  }, []);

  if (!data?.track) return <TrackSkeleton />;

  const song = {
    src: data.track.playbackUrl,
    trackId: data.track.id,
    art: data.track.artworkUrl || coverPhotoUrl || undefined,
    title: data.track.title,
  };

  return (
    <li
      className={`flex items-center gap-2 px-4 py-2 transition duration-300 hover:bg-gray-25 text-white text-sm ${isPlaying ? 'font-black' : 'font-semibold'
        } text-white text-sm`}
    >
      <p>{index}</p>
      <div className="h-10 w-10 relative flex items-center bg-gray-80">
        <Asset src={data.track.artworkUrl} />
      </div>
      <div>
        <h2>{data.track.title}</h2>
      </div>
      <button
        className="h-10 w-10 flex items-center justify-center ml-auto hover:scale-125 duration-75"
        aria-label={isPlaying ? 'Pause' : 'Play'}
        onClick={() => handleOnPlayClicked(song)}
      >
        {isPlaying ? <Pause /> : <Play />}
      </button>
    </li>
  );
};
