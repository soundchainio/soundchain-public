import Slider from '@reach/slider';
import { useAudioPlayerContext } from 'hooks/useAudioPlayer';
import { HeartFilled } from 'icons/HeartFilled';
import { Info } from 'icons/Info';
import { Matic } from 'icons/Matic';
import { Pause } from 'icons/Pause';
import { Play } from 'icons/Play';
import NextLink from 'next/link';
import React, { useEffect, useState } from 'react';
import { remainingTime, timeFromSecs } from 'utils/calculateTime';
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

export const MiniAudioPlayer = ({ song }: MiniAudioPlayerProps) => {
  const { art, artist, title, trackId, playbackCount, favoriteCount, saleType, price } = song;
  const { duration, progress, play, isCurrentSong, isCurrentlyPlaying, setProgressStateFromSlider } =
    useAudioPlayerContext();
  const [isPlaying, setIsPlaying] = useState(false);
  const [isSameSong, setIsSameSong] = useState(false);

  useEffect(() => {
    setIsPlaying(isCurrentlyPlaying(trackId));
    setIsSameSong(isCurrentSong(trackId));
  }, [isCurrentSong, isCurrentlyPlaying, setIsPlaying, setIsSameSong, trackId]);

  const onSliderChange = (value: number) => {
    setProgressStateFromSlider(value);
  };

  return (
    <div className="bg-black rounded-lg p-4 items-center">
      <div className="flex items-center gap-3">
        <div className="h-20 w-20 relative flex items-center">
          <Asset src={art} />
        </div>
        <div className="flex flex-col flex-1 truncate">
          <div className="flex gap-2">
            <div className="flex items-center">
              <button className="bg-white rounded-full w-8 h-8 flex items-center" onClick={() => play(song)}>
                {isPlaying ? (
                  <Pause className="text-white m-auto scale-125" />
                ) : (
                  <Play className="text-white m-auto scale-125" />
                )}
              </button>
            </div>
            <NextLink href={`/tracks/${trackId}`}>
              <div className="flex w-full cursor-pointer gap-1 truncate">
                <div className="truncate">
                  <div className="text-white font-black text-xs w-full truncate">
                    <div className="truncate" title={title || ''}>
                      {title ? title : 'Unknown Title'}
                    </div>
                  </div>
                  {artist && <div className="text-gray-80 text-xs font-black">{artist}</div>}
                </div>
                <div className="flex flex-1"></div>
                {saleType && saleType !== '' && (
                  <div className="h-1/3">
                    <BadgeTrack auction={saleType === 'auction'} label={saleType.toUpperCase()}></BadgeTrack>
                  </div>
                )}
                <div className="self-center">
                  <Info />
                </div>
              </div>
            </NextLink>
          </div>
          <div className="text-gray-80 text-xs flex gap-1 items-center pt-1">
            <Play fill="#808080" />
            <span>{playbackCount || 0}</span>
            <HeartFilled />
            <span>{favoriteCount || 0}</span>
            {saleType !== '' && (
              <>
                <div className="ml-auto text-white font-bold">{parseInt(price) / 1e18}</div>
                <Matic />
              </>
            )}
          </div>
          <div className="text-white flex flex-col mt-2">
            {isSameSong ? (
              <>
                <Slider
                  className="audio-player ml-1"
                  min={0}
                  max={duration}
                  value={progress}
                  onChange={onSliderChange}
                />
                <div className="flex mt-2 text-xs text-gray-80">
                  <div className="flex-1">{timeFromSecs(progress || 0)}</div>
                  <div className="flex-1 text-right">{remainingTime(progress, duration || 0)} </div>
                </div>
              </>
            ) : (
              <>
                <Slider className="audio-player ml-1" min={0} max={1} value={0} disabled />
                <div className="flex mt-2 text-xs text-gray-80">
                  <div className="flex-1">0:00</div>
                  <div className="flex-1 text-right" />
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
