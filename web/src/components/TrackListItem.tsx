import { useAudioPlayerContext } from 'hooks/useAudioPlayer';
import { Pause } from 'icons/PauseBottomAudioPlayer';
import { Play } from 'icons/PlayBottomAudioPlayer';
import NextLink from 'next/link';
import React from 'react';
import Asset from './Asset';

export type Song = {
  src: string;
  title?: string | null;
  trackId: string;
  artist?: string | null;
  art?: string | null;
  isFavorite?: boolean | null;
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
    isFavorite?: boolean | null;
  };
  handleOnPlayClicked: (song: Song) => void;
}

export const TrackListItem = ({ song, index, handleOnPlayClicked }: TrackProps) => {
  const { trackId, art, title, playbackCount } = song;
  const { isCurrentlyPlaying } = useAudioPlayerContext();
  const isPlaying = isCurrentlyPlaying && isCurrentlyPlaying(trackId);

  return (
    <li
      className={`flex items-center justify-between gap-2 px-4 py-2 transition duration-300 hover:bg-gray-25 ${
        isPlaying ? 'font-black' : 'font-semibold'
      } text-white text-xs`}
    >
      <NextLink href={`/tracks/${trackId}`}>
        <a className="flex items-center flex-1 gap-2 min-w-0">
          <p className="w-6 text-right flex-shrink-0">{index}</p>
          <div className="h-10 w-10 relative flex items-center bg-gray-80 flex-shrink-0">
            <Asset src={art} sizes="2.5rem" />
          </div>
          <div className="min-w-0">
            <p className="truncate">{title}</p>
            <div className="flex items-center gap-1">
              {playbackCount && (
                <>
                  <Play fill={'#808080'} width={7} height={8} />
                  <p className="text-xxs text-gray-80">{playbackCount}</p>
                </>
              )}
            </div>
          </div>
        </a>
      </NextLink>
      <button
        className="h-10 w-10 flex items-center justify-center hover:scale-125 duration-75 flex-shrink-0"
        aria-label={isPlaying ? 'Pause' : 'Play'}
        onClick={e => {
          e.stopPropagation();
          handleOnPlayClicked(song);
        }}
      >
        {isPlaying ? <Pause /> : <Play />}
      </button>
    </li>
  );
};
