import { useAudioPlayerContext } from 'hooks/useAudioPlayer';
import { HeartFilled } from 'icons/HeartFilled';
import { Matic } from 'icons/Matic';
import { Pause } from 'icons/Pause';
import { Play } from 'icons/Play';
import { ListingItemWithPrice, Maybe, TrackWithListingItem, useMaticUsdQuery } from 'lib/graphql';
import NextLink from 'next/link';
import React, { useEffect, useState } from 'react';
import { currency } from 'utils/format';
import Asset from './Asset';
import { BadgeTrack } from './BadgeTrack';

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
  };
  const { listingItem } = track;
  const saleType = getSaleType(listingItem);
  const price = listingItem?.priceToShow ?? 0;
  const { art, artist, title, trackId, playbackCount, favoriteCount } = song;
  const { play, isCurrentSong, isCurrentlyPlaying } = useAudioPlayerContext();
  const [isPlaying, setIsPlaying] = useState(false);
  const { data: maticUsd } = useMaticUsdQuery();

  useEffect(() => {
    setIsPlaying(isCurrentlyPlaying(trackId));
  }, [isCurrentSong, isCurrentlyPlaying, setIsPlaying, trackId]);

  return (
    <div className="p-0.5 rounded-lg bg-rainbow-gradient relative">
      <div className="bg-black rounded-md items-center">
        <NextLink href={`/tracks/${trackId}`}>
          <a>
            <div className="p-4">
              <div className="flex justify-center items-center mb-2">
                <div className="h-24 w-24 relative">
                  <Asset src={art} />
                </div>
              </div>
              <div className="flex w-full truncate justify-center mb-2">
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
              <div className="flex flex-col flex-1 truncate">
                {saleType && saleType !== '' && (
                  <div className="flex items-center gap-1 flex-wrap">
                    <div className="flex flex-1 items-start">
                      <div className="text-white font-bold text-sm mr-1">{price}</div>
                      <Matic height="18" width="18" className="" />
                    </div>
                    <BadgeTrack auction={saleType === 'auction'} label={saleType.toUpperCase()}></BadgeTrack>
                  </div>
                )}
                <div className="text-gray-80 text-xs">
                  {maticUsd && price && `${currency(price * parseFloat(maticUsd.maticUsd))}`}
                </div>
                <div className="text-gray-80 text-xs flex gap-1 items-center pt-1">
                  <Play fill="#808080" />
                  <span>{playbackCount || 0}</span>
                  <HeartFilled />
                  <span className="flex-1">{favoriteCount || 0}</span>
                </div>
              </div>
            </div>
          </a>
        </NextLink>
      </div>
      <div className="flex items-center absolute bottom-4 right-4">
        <button className="bg-white rounded-full w-6 h-6 flex items-center" onClick={() => play(song)}>
          {isPlaying ? <Pause className="text-white m-auto scale-125" /> : <Play className="text-white m-auto" />}
        </button>
      </div>
    </div>
  );
};
