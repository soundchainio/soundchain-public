import { LoaderAnimation } from 'components/LoaderAnimation';
import { useAudioPlayerContext } from 'hooks/useAudioPlayer';
import { HeartFilled } from 'icons/HeartFilled';
import { Matic } from 'icons/Matic';
import { Pause } from 'icons/Pause';
import { Play } from 'icons/Play';
import { ListingItemWithPrice, Maybe, Track, TrackWithListingItem, useMaticUsdQuery } from 'lib/graphql';
import dynamic from 'next/dynamic';
import NextLink from 'next/link';
import { useEffect, useState } from 'react';
import { currency } from 'utils/format';
import { Logo } from '../icons/Logo';
import { CurrencyType } from '../types/CurrenctyType';
import { Cards } from '../icons/Cards';
import Asset from './Asset';

const WavesurferComponent = dynamic(() => import('./wavesurfer'), {
  ssr: false,
});
interface TrackProps {
  track: TrackWithListingItem | Track;
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
    editionSize: track.editionSize,
    listingCount: track.listingCount,
  };

  let listingItem: Maybe<ListingItemWithPrice> = null;

  if (track.__typename === 'TrackWithListingItem') {
    listingItem = (track as TrackWithListingItem).listingItem;
  }

  const saleType = getSaleType(listingItem);
  const price = listingItem?.priceToShow ?? 0;
  const OGUNPrice = listingItem?.OGUNPricePerItemToShow ?? 0;
  const selectedCurrency: CurrencyType = price ? 'MATIC' : 'OGUN';
  const { art, artist, title, trackId, playbackCount, favoriteCount, editionSize, listingCount } = song;
  const { play, isCurrentSong, isCurrentlyPlaying, setProgressStateFromSlider, progress } = useAudioPlayerContext();

  const [isPlaying, setIsPlaying] = useState(false);
  const [isReady, setIsReady] = useState(false);

  const { data: maticUsd } = useMaticUsdQuery();

  useEffect(() => {
    setIsPlaying(isCurrentlyPlaying(trackId));
  }, [isCurrentSong, isCurrentlyPlaying, setIsPlaying, trackId]);

  const trackPrice = track.price.value;
  return (
    <div
      className={`${
        isPlaying ? 'gradient-track-box' : 'black-track-box'
      } hover:gradient-track-box flex max-w-[250px] flex-col rounded-lg`}
    >
      <NextLink href={`/tracks/${trackId}`}>
        <a>
          <div className="h-32 w-full overflow-hidden rounded-t-xl">
            <Asset src={art} />
          </div>
        </a>
      </NextLink>

      <NextLink href={`/tracks/${trackId}`}>
        <a>
          <div className="contente-center my-3 flex flex-col items-center decoration-gray-80">
            <div className="max-w-[248px] overflow-hidden text-ellipsis text-sm font-bold" title={title || ''}>
              {title ? title : 'Unknown Title'}
            </div>
            <div className="text-sm font-bold text-gray-80" title={artist || ''}>
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
          <div className="mx-3 mt-3 flex items-start justify-between">
            <div className="flex flex-col items-start justify-start">
              <div className="flex items-center">
                <div className="mr-1.5 mt-1 font-semibold">{selectedCurrency === 'MATIC' ? trackPrice : OGUNPrice}</div>
                {selectedCurrency === 'MATIC' ? (
                  <Matic height="20" width="23" className="" />
                ) : (
                  <Logo height="20" width="23" className="" />
                )}
              </div>

              {trackPrice > 0 && (
                <div className="mt-0.5 text-xs font-semibold text-gray-80">
                  {selectedCurrency === 'MATIC' ? (
                    maticUsd &&
                    maticUsd.maticUsd &&
                    trackPrice &&
                    `${currency(trackPrice * parseFloat(maticUsd.maticUsd))}`
                  ) : (
                    <></>
                  )}
                </div>
              )}
            </div>
            <div className="flex flex-col items-end justify-start">
              <div
                className={`${
                  saleType === 'auction' ? 'auction-gradient' : 'buy-now-gradient'
                } sale-type-font-size text-sm font-bold`}
              >
                {saleType.toUpperCase()}
              </div>
              {editionSize > 0 && (
                <div className="flex items-center justify-between gap-2 text-xs font-black text-gray-80">
                  <Cards width={14} height={14} />
                  {listingCount > 0 && (
                    <>
                      {listingCount}
                      {' / '}
                    </>
                  )}
                  {editionSize}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      <div className="m-3 flex items-center justify-between">
        {!isReady ? (
          <LoaderAnimation ring />
        ) : (
          <button className="flex h-6 w-6 items-center rounded-full bg-white" onClick={() => play(song)}>
            {isPlaying ? <Pause className="m-auto scale-125 text-white" /> : <Play className="m-auto text-white" />}
          </button>
        )}

        <div className="flex items-center gap-1 pt-1 text-xs font-medium text-gray-80">
          <Play fill="#808080" />
          <span>{playbackCount || 0}</span>
          <HeartFilled />
          <span className="flex-1">{favoriteCount || 0}</span>
        </div>
      </div>
    </div>
  );
};
