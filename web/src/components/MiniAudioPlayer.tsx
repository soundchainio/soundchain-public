import Slider from '@reach/slider';
import { useAudioPlayerContext } from 'hooks/useAudioPlayer';
import { Cards } from 'icons/Cards';
import { HeartFilled } from 'icons/HeartFilled';
import { Pause } from 'icons/Pause';
import { Play } from 'icons/Play';
import NextLink from 'next/link';
import { useEffect, useState } from 'react';
import { remainingTime, timeFromSecs } from 'utils/calculateTime';
import { TrackPrice } from '../lib/graphql';
import Asset from './Asset';
import { BadgeTrack } from './BadgeTrack';
import { PriceDisplay } from './PriceDisplay';

interface Song {
  src: string;
  title?: string | null;
  trackId: string;
  artist?: string | null;
  art?: string | null;
  isFavorite: boolean | null;
  playbackCount: string;
  favoriteCount: number;
  listingCount?: number;
  saleType: string;
  price: TrackPrice;
  editionSize?: number;
}

interface MiniAudioPlayerProps {
  song: Song;
  hideBadgeAndPrice?: boolean;
}

export const MiniAudioPlayer = (props: MiniAudioPlayerProps) => {
  const {
    art,
    artist,
    title,
    trackId,
    playbackCount,
    favoriteCount,
    saleType,
    price,
    editionSize = 0,
    listingCount,
  } = props.song;
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
    <div className='text-gray-80 text-xs flex gap-1 items-center'>
      <Play fill='#808080' />
      <span>{playbackCount || 0}</span>
      <HeartFilled />
      <span>{favoriteCount || 0}</span>
    </div>
  );

  return (
    <div
      className={`bg-black rounded-lg p-4 items-center transparent-border-1px ${
        isPlaying ? 'gradient-track-box' : 'bg-black'
      } hover:gradient-track-box`}
    >
      <div className='flex items-center gap-3'>
        <div className='h-20 w-20 relative flex items-center'>
          <Asset src={art} sizes='5rem' />
        </div>
        <div className='flex flex-col flex-1 truncate'>
          <div className={`flex items-start gap-2 ${hideBadgeAndPrice && 'mb-[10px]'}`}>
            <div className='flex items-center'>
              <button
                className='bg-white rounded-full w-8 h-8 flex items-center'
                onClick={() => play(song)}
                aria-label={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? (
                  <Pause className='text-white m-auto scale-125' />
                ) : (
                  <Play className='text-white m-auto scale-125' />
                )}
              </button>
            </div>
            <NextLink href={`/tracks/${trackId}`}>
              <a className='w-full truncate flex gap-0.5 flex-col'>
                <div className='flex w-full truncate items-start text-white font-black text-xs justify-between gap-0.5'>
                  <p className='truncate' title={title || ''}>{title ? title : 'Unknown Title'}</p>
                  <div className='flex flex-col justify-center items-end gap-1 shrink-0'>
                    {saleType && saleType !== '' && !hideBadgeAndPrice && (
                      <BadgeTrack label={saleType.toUpperCase()} />
                    )}
                  </div>
                </div>
                <div className='flex w-full truncate items-start text-white font-black text-xs justify-between gap-0.5'>
                  {artist && <p className='text-gray-80 text-xs font-black truncate' title={artist}>{artist}</p>}
                  {saleType && saleType !== '' && !hideBadgeAndPrice && editionSize > 0 &&
                    <p className="flex items-center justify-between gap-2 text-xs font-black text-gray-80 shrink-0">
                      <Cards width={14} height={14} />
                      {listingCount && listingCount > 0 && (
                        `${listingCount} / `
                      )}
                      {editionSize}
                    </p>
                  }
                </div>
              </a>
            </NextLink>
          </div>
          <div className='flex justify-between mt-2'>
            <RenderTrackCounters />
            {saleType && saleType !== '' && !hideBadgeAndPrice && price && (
              <>
                <PriceDisplay price={price} className='ml-auto text-xs' variant='currency-inline' showBonus/>
              </>
            )}
          </div>

          <div className='text-white flex flex-col mt-2'>
            {isSameSong ? (
              <>
                <Slider
                  className='audio-player ml-1'
                  min={0}
                  max={duration}
                  value={progress}
                  onChange={onSliderChange}
                />
                <div className='flex mt-2 text-xs text-gray-80'>
                  <div className='flex-1'>{timeFromSecs(progress || 0)}</div>
                  <div className='flex-1 text-right'>{remainingTime(progress, duration || 0)} </div>
                </div>
              </>
            ) : (
              <>
                <Slider className='audio-player ml-1' min={0} max={1} value={0} disabled />
                <div className='flex mt-2 text-xs text-gray-80'>
                  <div className='flex-1'>0:00</div>
                  <div className='flex-1 text-right' />
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};