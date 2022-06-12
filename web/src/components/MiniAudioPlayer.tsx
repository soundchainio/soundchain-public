import Slider from '@reach/slider';
import { Matic } from 'components/Matic';
import { useAudioPlayerContext } from 'hooks/useAudioPlayer';
import { HeartFilled } from 'icons/HeartFilled';
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
  price: number;
}

interface MiniAudioPlayerProps {
  song: Song;
  hideBadgeAndPrice?: boolean;
}

export const MiniAudioPlayer = (props: MiniAudioPlayerProps) => {
  const { art, artist, title, trackId, playbackCount, favoriteCount, saleType, price } = props.song;
  const { hideBadgeAndPrice, song } = props;

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

  const RenderTrackCounters = () => (
    <div className="flex items-center gap-1 px-2 text-xs text-gray-80">
      <Play fill="#808080" />
      <span>{playbackCount || 0}</span>
      <HeartFilled />
      <span>{favoriteCount || 0}</span>
      {saleType && saleType !== '' && !hideBadgeAndPrice && !!price && (
        <Matic className="ml-auto" value={price} variant="currency-inline" />
      )}
    </div>
  );

  return (
    <div
      className={`transparent-border-1px m-4 items-center rounded-lg bg-black p-4 ${
        isPlaying ? 'gradient-track-box' : 'bg-black'
      } hover:gradient-track-box`}
    >
      <div className="flex items-center gap-3">
        <div className="relative flex h-20 w-20 items-center">
          <Asset src={art} sizes="5rem" />
        </div>
        <div className="flex flex-1 flex-col truncate">
          <div className={`flex gap-2 ${hideBadgeAndPrice && 'mb-[10px]'}`}>
            <div className="flex items-center">
              <button
                className="flex h-8 w-8 items-center rounded-full bg-white"
                onClick={() => play(song)}
                aria-label={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? (
                  <Pause className="m-auto scale-125 text-white" />
                ) : (
                  <Play className="m-auto scale-125 text-white" />
                )}
              </button>
            </div>
            <NextLink href={`/tracks/${trackId}`}>
              <a className="w-full truncate">
                <div className="flex w-full cursor-pointer items-start truncate">
                  <div className="w-full truncate">
                    <div className="flex w-full justify-between truncate text-xs font-black text-white">
                      <div className="flex-1 truncate" title={title || ''}>
                        {title ? title : 'Unknown Title'}
                      </div>

                      <RenderTrackCounters />
                    </div>
                    {artist && <div className="text-xs font-black text-gray-80">{artist}</div>}
                  </div>
                  <div className="flex flex-1" />
                  <div className="flex items-center gap-1">
                    {saleType && saleType !== '' && !hideBadgeAndPrice && (
                      <BadgeTrack label={saleType.toUpperCase()}></BadgeTrack>
                    )}
                  </div>
                </div>
              </a>
            </NextLink>
          </div>
          <div className="mt-2 flex flex-col text-white">
            {isSameSong ? (
              <>
                <Slider
                  className="audio-player ml-1"
                  min={0}
                  max={duration}
                  value={progress}
                  onChange={onSliderChange}
                />
                <div className="mt-2 flex text-xs text-gray-80">
                  <div className="flex-1">{timeFromSecs(progress || 0)}</div>
                  <div className="flex-1 text-right">{remainingTime(progress, duration || 0)} </div>
                </div>
              </>
            ) : (
              <>
                <Slider className="audio-player ml-1" min={0} max={1} value={0} disabled />
                <div className="mt-2 flex text-xs text-gray-80">
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
