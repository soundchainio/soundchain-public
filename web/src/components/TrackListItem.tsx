import { useAudioPlayerContext } from 'hooks/useAudioPlayer';
import { Pause } from 'icons/PauseBottomAudioPlayer';
import { Play } from 'icons/PlayBottomAudioPlayer';
import React from 'react';
import Asset from './Asset';

export type Song = {
  src: string;
  title?: string | null;
  trackId: string;
  artist?: string | null;
  art?: string | null;
};

interface TrackProps {
  index: number;
  song: {
    src: string;
    title?: string | null;
    trackId: string;
    artist?: string | null;
    art?: string | null;
    playbackCount: string;
  };
  handleOnPlayClicked: (song: Song) => void;
}

export const TrackListItem = ({ song, index, handleOnPlayClicked }: TrackProps) => {
  const { trackId, art, title, playbackCount } = song;
  const { isCurrentlyPlaying } = useAudioPlayerContext();
  const isPlaying = isCurrentlyPlaying && isCurrentlyPlaying(trackId);

  return (
    <li
      className={`flex items-center gap-2 px-4 py-2 transition duration-300 hover:bg-gray-25 ${
        isPlaying ? 'font-black' : 'font-semibold'
      } text-white text-xs`}
    >
      <p className="w-6 text-right">{index}</p>
      <div className="h-10 w-10 relative flex items-center bg-gray-80">
        <Asset src={art} />
      </div>
      <div>
        <p>{title}</p>
        <div className="flex items-center gap-1">
          {playbackCount && (
            <>
              <Play fill={'#808080'} width={7} height={8} />
              <p className="text-xxs text-gray-80">{playbackCount}</p>
            </>
          )}
        </div>
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
