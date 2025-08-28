import { useEffect, useState, forwardRef } from 'react';
import { LoaderAnimation } from 'components/LoaderAnimation';
import { useAudioPlayerContext } from 'hooks/useAudioPlayer';
import { HeartFilled } from 'icons/HeartFilled';
import { Matic } from 'icons/Matic';
import { Pause } from 'icons/Pause';
import { Play } from 'icons/Play';
import { ListingItemWithPrice, Maybe, Track, TrackWithListingItem, useMaticUsdQuery } from 'lib/graphql';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { currency, limitTextToNumberOfCharacters } from 'utils/format';
import { Cards } from '../../../../icons/Cards';
import { Logo } from 'icons/Logo';
import { CurrencyType } from '../../../../types/CurrenctyType';
import Asset from '../../../Asset/Asset';
import { useModalDispatch } from 'contexts/providers/modal';
import { createPublicClient, http } from 'viem';
import { zetachain, polygon } from 'viem/chains';
import { ShowRemoveListing } from 'contexts/payloads/modal';
import { SaleType } from 'types/SaleType';
const WavesurferComponent = dynamic(() => import('../../../wavesurfer'), { ssr: false });

// Mock icon component for all tokens
const TokenIcon = ({ symbol }: { symbol: string }) => {
  const iconMap: { [key: string]: JSX.Element } = {
    MATIC: <Matic height="20" width="23" />,
    OGUN: <Logo height="20" width="23" />,
    ETH: <div>ETH</div>,
    USDC: <div>USDC</div>,
    USDT: <div>USDT</div>,
    SOL: <div>SOL</div>,
    BNB: <div>BNB</div>,
    DOGE: <div>DOGE</div>,
    BONK: <div>BONK</div>,
    MEATEOR: <div>MEAT</div>,
    PEPE: <div>PEPE</div>,
    BASE: <div>BASE</div>,
    XTZ: <div>XTZ</div>,
    AVAX: <div>AVAX</div>,
    SHIB: <div>SHIB</div>,
    XRP: <div>XRP</div>,
    SUI: <div>SUI</div>,
    HBAR: <div>HBAR</div>,
    LINK: <div>LINK</div>,
    LTC: <div>LTC</div>,
    ZETA: <div>ZETA</div>,
    BTC: <div>BTC</div>,
    PENGU: <div>PENGU</div>,
  };
  return iconMap[symbol] || <div>{symbol}</div>;
};

export interface TrackProps {
  track: TrackWithListingItem | Track;
  coverPhotoUrl?: string;
  handleOnPlayClicked?: () => void;
  ref?: React.Ref<HTMLDivElement>;
  walletProvider?: any;
  getContractAddress?: (token: string, chainId?: number) => string;
}

interface ExtendedListingItem extends ListingItemWithPrice {
  chainId?: number;
  tokenSymbol?: string;
  bundleId?: string;
  privateAsset?: string;
}

const TrackGrid = forwardRef<HTMLDivElement, TrackProps>(
  ({ track, handleOnPlayClicked, walletProvider, getContractAddress }, ref) => {
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
      chainId:
        track.__typename === 'TrackWithListingItem' && track.listingItem
          ? (track.listingItem as ExtendedListingItem).chainId
          : undefined,
      tokenSymbol:
        track.__typename === 'TrackWithListingItem' && track.listingItem
          ? (track.listingItem as ExtendedListingItem).tokenSymbol
          : 'MATIC',
      bundleId:
        track.__typename === 'TrackWithListingItem' && track.listingItem
          ? (track.listingItem as ExtendedListingItem).bundleId
          : undefined,
      privateAsset:
        track.__typename === 'TrackWithListingItem' && track.listingItem
          ? (track.listingItem as ExtendedListingItem).privateAsset
          : undefined,
    };
    let listingItem: Maybe<ExtendedListingItem> = null;
    if (track.__typename === 'TrackWithListingItem' && track.listingItem) {
      listingItem = track.listingItem as ExtendedListingItem;
    }
    const router = useRouter();
    const saleType = getSaleType(listingItem);
    const price = listingItem?.priceToShow ?? 0;
    const dispatch = useModalDispatch();
    const selectedCurrency: CurrencyType = listingItem?.tokenSymbol as CurrencyType || 'MATIC';
    const { art, artist, title, trackId, playbackCount, favoriteCount, editionSize, listingCount, chainId, tokenSymbol, bundleId, privateAsset } = song;
    const { isCurrentSong, isCurrentlyPlaying, setProgressStateFromSlider, progress } = useAudioPlayerContext();
    const [isPlaying, setIsPlaying] = useState(false);
    const [isReady, setIsReady] = useState(false);
    const { data: maticUsd } = useMaticUsdQuery();
    useEffect(() => {
      setIsPlaying(isCurrentlyPlaying(trackId || ''));
    }, [isCurrentSong, isCurrentlyPlaying, setIsPlaying, trackId]);
    const trackPrice = Number(track?.price.value || (listingItem?.pricePerItem ?? 0)); // Ensure numeric
    const [isOgunPrice, setIsOgunPrice] = useState(false); // State for OGUN listing with rewards
    const onTrackClick = () => {
      if (handleOnPlayClicked) handleOnPlayClicked();
    };

    const handleListForSale = async () => {
      if (walletProvider) {
        try {
          const accounts = await walletProvider.enable();
          const account = accounts[0];
          const contractAddress = getContractAddress ? getContractAddress(tokenSymbol || 'MATIC', chainId) : '0x0000000000000000000000000000000000000000';
          const client = createPublicClient({
            chain: chainId === 137 ? polygon : zetachain,
            transport: http(),
          });
          const payload: ShowRemoveListing = {
            show: true,
            tokenId: undefined,
            trackId: trackId,
            saleType: saleType as SaleType,
            editionId: undefined,
            contractAddresses: undefined,
            trackEditionId: undefined,
          };
          // Set isOgunPrice based on user intent
          setIsOgunPrice(selectedCurrency === 'OGUN'); // Sync with OGUN selection
          dispatch.dispatchShowRemoveListingModal(payload); // Correct method call
          // Placeholder for rewards logic
          if (isOgunPrice) {
            console.log('OGUN listing initiated, triggering rewards for seller and buyer');
            // Future: Call Marketplace.sol for rewards
          }
        } catch (error) {
          console.error('Listing error:', error);
        }
      }
    };

    const sweepIndicator = bundleId ? 'Sweepable' : '';
    const tokenBadge = tokenSymbol && !['MATIC', 'OGUN'].includes(tokenSymbol) ? `+${tokenSymbol}` : '';
    const currencyIcon = <TokenIcon symbol={selectedCurrency} />;

    return (
      <div ref={ref} className={`rounded-lg bg-transparent p-0.5 hover:bg-rainbow-gradient ${isPlaying && 'bg-rainbow-gradient'}`}>
        <div className="flex w-[300px] flex-col rounded-lg bg-black text-white sm:w-full">
          <Link href={`/tracks/${trackId}`} passHref>
            <div className="h-[300px] overflow-hidden rounded-t-xl sm:h-[225px]">
              <Asset src={art} />
              {chainId === 7000 && <span className="text-xs text-blue-500">ZetaChain</span>}
            </div>
          </Link>
          <div className="my-3 flex flex-col content-center items-center decoration-gray-80">
            <Link href={`/tracks/${trackId}`} passHref>
              <div className="mx-4 mb-2 text-sm font-bold" title={title || ''}>
                {limitTextToNumberOfCharacters(title ? title : 'Unknown Title', 20)}
                {tokenBadge && <span className="ml-1 text-xs text-green-500">{tokenBadge}</span>}
              </div>
            </Link>
            <Link href={`/profiles/${artist}`} passHref>
              <div className="text-center text-sm font-bold text-gray-80 hover:text-gray-400" title={artist || ''}>
                {artist ? artist : 'Unknown'}
              </div>
            </Link>
          </div>
          <div className="mx-2">
            <WavesurferComponent
              setIsReady={setIsReady}
              url={song.url}
              isPlaying={isPlaying}
              setProgressStateFromSlider={setProgressStateFromSlider}
              progress={progress}
            />
          </div>
          <div>
            {saleType && (
              <div className="mx-3 mt-3 flex items-start justify-between">
                <div className="flex flex-col items-start justify-start">
                  <div className="flex items-center">
                    <div className="mr-1.5 mt-1 font-semibold">{trackPrice}</div>
                    {currencyIcon}
                  </div>
                  {trackPrice > 0 && (
                    <div className="mt-0.5 text-xs font-semibold text-gray-80">
                      {selectedCurrency === 'MATIC' && maticUsd && maticUsd.maticUsd && trackPrice && `${currency(trackPrice * parseFloat(maticUsd.maticUsd))}`}
                    </div>
                  )}
                  {sweepIndicator && <span className="text-xs text-yellow-500">{sweepIndicator}</span>}
                </div>
                <div className="flex flex-col items-end justify-start">
                  {saleType === 'auction' ? (
                    <Link
                      href={{
                        pathname: `tracks/${track.id}/place-bid`,
                        query: { ...router.query, isPaymentOGUN: isOgunPrice },
                      }}
                      passHref
                    >
                      <div className="auction-gradient sale-type-font-size text-sm font-bold">{saleType.toUpperCase()}</div>
                    </Link>
                  ) : (
                    <Link
                      href={{
                        pathname: `tracks/${track.id}/buy-now`,
                        query: { ...router.query, isPaymentOGUN: isOgunPrice },
                      }}
                      passHref
                    >
                      <div className="buy-now-gradient sale-type-font-size text-sm font-bold">{saleType.toUpperCase()}</div>
                    </Link>
                  )}
                  {editionSize && editionSize > 0 && (
                    <div className="flex items-center justify-between gap-2 text-xs font-black text-gray-80">
                      <Cards width={14} height={14} />
                      {listingCount && listingCount > 0 && (
                        <>
                          {listingCount}
                          {' / '}
                        </>
                      )}
                      {editionSize}
                    </div>
                  )}
                  {privateAsset && <span className="text-xs text-purple-500">{privateAsset}</span>}
                  <button onClick={() => setIsOgunPrice(!isOgunPrice)} className="mt-2 text-xs text-blue-500">
                    Toggle OGUN Listing (Rewards: {isOgunPrice ? 'Active' : 'Inactive'})
                  </button>
                  <button onClick={handleListForSale} className="mt-2 text-xs text-blue-500">List for Sale</button>
                </div>
              </div>
            )}
          </div>
          <div className="m-4 flex items-center justify-between">
            {!isReady ? <LoaderAnimation ring /> : (
              <button className="flex h-6 w-6 items-center rounded-full bg-white" onClick={onTrackClick}>
                {isPlaying ? <Pause className="m-auto scale-125 text-white" /> : <Play className="m-auto text-white" />}
              </button>
            )}
            <div className="my-2 flex items-center gap-1 pt-1 text-xs font-medium text-gray-80">
              <Play fill="#808080" />
              <span>{playbackCount || 0}</span>
              <HeartFilled />
              <span className="flex-1">{favoriteCount || 0}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }
);

const getSaleType = (res: Maybe<ListingItemWithPrice>): string => {
  if (res?.endingTime) return 'auction';
  else if (res?.pricePerItem) return 'buy now';
  return '';
};

export default TrackGrid;
