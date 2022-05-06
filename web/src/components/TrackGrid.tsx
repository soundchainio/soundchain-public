import { useAudioPlayerContext } from 'hooks/useAudioPlayer';
import { HeartFilled } from 'icons/HeartFilled';
import { Matic } from 'icons/Matic';
import { Pause } from 'icons/Pause';
import { Play } from 'icons/Play';
import { ListingItemWithPrice, Maybe, TrackWithListingItem, useMaticUsdQuery } from 'lib/graphql';
import dynamic from 'next/dynamic';
import NextLink from 'next/link';
import React, { useEffect, useState } from 'react';
import { currency } from 'utils/format';
import Asset from './Asset';
import { LoaderAnimation } from 'components/LoaderAnimation';

const WavesurferComponent = dynamic(() => import('./wavesurfer'), {
  ssr: false,
});
interface TrackProps {
  track: TrackWithListingItem;
  coverPhotoUrl?: string;
}

const getSaleType = (res: Maybe<ListingItemWithPrice>): string => {
  if (res?.endingTime) {
    return 'auction';
  } else if (res?.pricePerItem) {
    return 'buy now';
  }
  return '';
};

export const TrackGrid = ({ track }: TrackProps) => {
  const song = {
    src: track.playbackUrl,
    trackId: track.id,
    art: track.artworkUrl || undefined,
    title: track.title,
    artist: track.artist,
    isFavorite: track.isFavorite,
    playbackCount: track.playbackCountFormatted,
    favoriteCount: track.favoriteCount,
    url: track.assetUrl,
  };
  const { listingItem } = track;
  const saleType = getSaleType(listingItem);
  const price = listingItem?.priceToShow ?? 0;
  const { art, artist, title, trackId, playbackCount, favoriteCount } = song;
  const { play, isCurrentSong, isCurrentlyPlaying, setProgressStateFromSlider, progress } = useAudioPlayerContext();

  const [isPlaying, setIsPlaying] = useState(false);
  const [isReady, setIsReady] = useState(false);

  const { data: maticUsd } = useMaticUsdQuery();

  useEffect(() => {
    setIsPlaying(isCurrentlyPlaying(trackId));
  }, [isCurrentSong, isCurrentlyPlaying, setIsPlaying, trackId]);

  return (
    <div className={`${isPlaying ? 'gradient-track-box' : 'black-track-box'} rounded-lg hover:gradient-track-box`}>
      <NextLink href={`/tracks/${trackId}`}>
        <a>
          <div className="h-32 w-full rounded-t-lg overflow-hidden">
            <Asset src={art} />
          </div>
        </a>
      </NextLink>

      <NextLink href={`/tracks/${trackId}`}>
        <a>
          <div className="flex items-center flex-col contente-center my-3 decoration-gray-80">
            <div className="font-bold text-sm" title={title || ''}>
              {title ? title : 'Unknown Title'}
            </div>
            <div className="font-bold text-gray-80 text-sm" title={artist || ''}>
              {artist ? artist : 'Unknown'}
            </div>
          </div>
        </a>
      </NextLink>
      <WavesurferComponent
        setIsReady={setIsReady}
        url={song.url}
        isPlaying={isPlaying}
        setProgressStateFromSlider={setProgressStateFromSlider}
        progress={progress}
      />
      <div>
        {saleType && (
          <div className="flex items-center justify-between mt-3 mx-3">
            <div className="flex items-center">
              <div className="mr-1.5 font-semibold">{price}</div>
              <Matic height="20" width="23" className="" />
            </div>
            <div
              className={`${
                saleType === 'auction' ? 'auction-gradient' : 'buy-now-gradient'
              } sale-type-font-size text-xs font-bold`}
            >
              {saleType.toUpperCase()}
            </div>
          </div>
        )}
        <div className="text-gray-80 text-xs ml-3 mt-0.5 font-semibold">
          {maticUsd && price && `${currency(price * parseFloat(maticUsd.maticUsd))}`}
        </div>
      </div>

      <div className="flex items-center justify-between m-3">
        <div className="text-gray-80 text-xs flex gap-1 items-center pt-1 font-medium">
          <Play fill="#808080" />
          <span>{playbackCount || 0}</span>
          <HeartFilled />
          <span className="flex-1">{favoriteCount || 0}</span>
        </div>

        {!isReady ? (
          <LoaderAnimation ring />
        ) : (
          <button className="bg-white rounded-full w-6 h-6 flex items-center" onClick={() => play(song)}>
            {isPlaying ? <Pause className="text-white m-auto scale-125" /> : <Play className="text-white m-auto" />}
          </button>
        )}
      </div>
    </div>
  );
};
