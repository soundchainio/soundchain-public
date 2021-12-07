import { useAudioPlayerContext } from 'hooks/useAudioPlayer';
import { HeartFilled } from 'icons/HeartFilled';
import { Matic } from 'icons/Matic';
import { Pause } from 'icons/Pause';
import { Play } from 'icons/Play';
import NextLink from 'next/link';
import React, { useEffect, useState } from 'react';
import Asset from './Asset';
import { BadgeTrack } from './BadgeTrack';

interface Song {
  src: string;
  title?: string | null;
  trackId: string;
  artist?: string | null;
  art?: string | null;
  isFavorite: boolean | null;
  playbackCount: string;
  favoriteCount: number;
  saleType: string;
  price: string;
}

interface MiniAudioPlayerProps {
  song: Song;
}

export const TrackGrid = ({ song }: MiniAudioPlayerProps) => {
  const { art, artist, title, trackId, playbackCount, favoriteCount, saleType, price } = song;
  const { play, isCurrentSong, isCurrentlyPlaying } = useAudioPlayerContext();
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    setIsPlaying(isCurrentlyPlaying(trackId));
  }, [isCurrentSong, isCurrentlyPlaying, setIsPlaying, trackId]);

  return (
    <div className={'p-0.5 rounded-xl bg-rainbow-gradient'}>
      <div className="bg-black rounded-lg p-4 items-center">
        <div className="flex justify-center items-center mb-2">
          <div className="h-24 w-24 relative">
            <Asset src={art} />
          </div>
        </div>
        <NextLink href={`/tracks/${trackId}`}>
          <div className="flex w-full cursor-pointer truncate justify-center mb-2">
            <div className="truncate">
              <div className="text-white font-black text-xs truncate text-center">
                <div className="truncate" title={title || ''}>
                  {title ? title : 'Unknown Title'}
                </div>
              </div>
              <div className="text-gray-80 font-black text-xs text-center">
                <div className="truncate" title={artist || ''}>
                  {artist ? artist : 'Unknown'}
                </div>
              </div>
            </div>
          </div>
        </NextLink>
        <div className="flex items-center gap-3">
          <div className="flex flex-col flex-1 truncate">
            <div className="flex items-center gap-1">
              {saleType && saleType !== '' && (
                <>
                  <div className="text-white font-bold text-xxs">{(parseInt(price) / 1e18).toFixed(3)}</div>
                  <div className="flex items-center justify-center flex-shrink-0 h-full">
                    <Matic height="12" width="12" />
                  </div>
                  <BadgeTrack auction={saleType === 'auction'} label={saleType.toUpperCase()}></BadgeTrack>
                </>
              )}
            </div>
            <div className="text-gray-80 text-xs flex gap-1 items-center pt-1">
              <Play fill="#808080" />
              <span>{playbackCount || 0}</span>
              <HeartFilled />
              <span>{favoriteCount || 0}</span>
            </div>
          </div>
          <div className="flex items-center">
            <button className="bg-white rounded-full w-6 h-6 flex items-center" onClick={() => play(song)}>
              {isPlaying ? <Pause className="text-white m-auto scale-125" /> : <Play className="text-white m-auto" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
