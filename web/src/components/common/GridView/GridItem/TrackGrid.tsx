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
import { getDisplaySymbol, Token } from 'constants/tokens';
import { Cards } from '../../../../icons/Cards';
import { Logo } from 'icons/Logo';
import { CurrencyType } from '../../../../types/CurrenctyType';
import Asset from '../../../Asset/Asset';
import { useModalDispatch } from 'contexts/ModalContext';
import { createPublicClient, http } from 'viem';
import { zetachain, polygon } from 'viem/chains';
import { ShowRemoveListing } from 'contexts/payloads/modal';
import { SaleType } from 'lib/graphql';
import { RotateCcw, Database, Expand } from 'lucide-react';
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

// Chain name mapping for display
const chainNames: { [key: number]: string } = {
  1: 'Ethereum', 137: 'Polygon', 56: 'BSC', 101: 'Solana', 250: 'Fantom',
  43114: 'Avalanche', 7000: 'ZetaChain', 8453: 'Base', 1284: 'Moonbeam',
  25: 'Cronos', 100: 'Gnosis', 128: 'Heco', 42161: 'Arbitrum', 10: 'Optimism'
};

const TrackGrid = forwardRef<HTMLDivElement, TrackProps>(
  ({ track, handleOnPlayClicked, walletProvider, getContractAddress }, ref) => {
    const [isFlipped, setIsFlipped] = useState(false);
    const { preloadTrack } = useAudioPlayerContext();
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

    // Preload audio + artwork on hover for instant playback
    const handleMouseEnter = () => {
      if (track.playbackUrl) {
        preloadTrack(track.playbackUrl, track.artworkUrl);
      }
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
          if (!getContractAddress) {
            console.error('TrackGrid: getContractAddress prop is required for listing');
            return;
          }
          const contractAddress = getContractAddress(tokenSymbol || 'MATIC', chainId);
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

    const handleFlip = (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsFlipped(!isFlipped);
    };

    return (
      <div ref={ref} className="nft-flip-card-container" onClick={handleFlip} onMouseEnter={handleMouseEnter}>
        <div className={`nft-flip-card ${isFlipped ? 'flipped' : ''}`}>
          {/* FRONT SIDE - Track Card */}
          <div className="nft-flip-card-front">
            <div className={`retro-card h-full ${isPlaying ? 'soundchain-gradient-border' : ''}`}>
              {/* Flip Hint */}
              <div className="flip-hint">
                <RotateCcw className="w-3 h-3" />
              </div>

              {/* Artwork */}
              <Link href={`/tracks/${trackId}`} passHref onClick={(e) => e.stopPropagation()}>
                <div className="aspect-square overflow-hidden analog-glow relative group">
                  <Asset src={art} />
                  {chainId && (
                    <span className={`absolute top-2 left-2 text-xs px-2 py-0.5 rounded chain-${chainNames[chainId]?.toLowerCase() || 'polygon'}`}>
                      {chainNames[chainId] || 'Polygon'}
                    </span>
                  )}
                </div>
              </Link>

              {/* Track Info */}
              <div className="p-3">
                <Link href={`/tracks/${trackId}`} passHref onClick={(e) => e.stopPropagation()}>
                  <h3 className="retro-title text-sm truncate mb-1" title={title || ''}>
                    {limitTextToNumberOfCharacters(title ? title : 'Unknown Title', 20)}
                  </h3>
                </Link>
                <Link href={`/profiles/${artist}`} passHref onClick={(e) => e.stopPropagation()}>
                  <p className="retro-json text-xs truncate">{artist || 'Unknown Artist'}</p>
                </Link>

                {/* Waveform */}
                <div className="my-2" onClick={(e) => e.stopPropagation()}>
                  <WavesurferComponent
                    setIsReady={setIsReady}
                    url={song.url}
                    isPlaying={isPlaying}
                    setProgressStateFromSlider={setProgressStateFromSlider}
                    progress={progress}
                  />
                </div>

                {/* Price & Sale Type */}
                {saleType && (
                  <div className="metadata-section">
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="flex items-center gap-1">
                          <span className="metadata-value text-lg">{trackPrice}</span>
                          {currencyIcon}
                        </div>
                        {trackPrice > 0 && selectedCurrency === 'MATIC' && maticUsd?.maticUsd && (
                          <span className="text-xs text-gray-400">
                            ≈ {currency(trackPrice * parseFloat(maticUsd.maticUsd))} USD
                          </span>
                        )}
                      </div>
                      <div className="text-right" onClick={(e) => e.stopPropagation()}>
                        {saleType === 'auction' ? (
                          <Link href={{ pathname: `tracks/${track.id}/place-bid`, query: { ...router.query, isPaymentOGUN: isOgunPrice } }} passHref>
                            <span className="retro-button text-xs py-1 px-2">AUCTION</span>
                          </Link>
                        ) : (
                          <Link href={{ pathname: `tracks/${track.id}/buy-now`, query: { ...router.query, isPaymentOGUN: isOgunPrice } }} passHref>
                            <span className="retro-button text-xs py-1 px-2">BUY NOW</span>
                          </Link>
                        )}
                      </div>
                    </div>
                    {tokenBadge && <span className="metadata-attribute mt-2 inline-block">{tokenBadge}</span>}
                    {sweepIndicator && <span className="metadata-attribute mt-2 ml-1 inline-block">{sweepIndicator}</span>}
                  </div>
                )}

                {/* Play Controls */}
                <div className="flex items-center justify-between mt-3" onClick={(e) => e.stopPropagation()}>
                  {!isReady ? <LoaderAnimation ring /> : (
                    <button className="retro-button p-2 rounded-full" onClick={onTrackClick}>
                      {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    </button>
                  )}
                  <div className="flex items-center gap-3 text-xs text-gray-400 retro-text">
                    <span className="flex items-center gap-1"><Play fill="#808080" className="w-3 h-3" /> {playbackCount || 0}</span>
                    <span className="flex items-center gap-1"><HeartFilled className="w-3 h-3" /> {favoriteCount || 0}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* BACK SIDE - Metadata JSON */}
          <div className="nft-flip-card-back">
            <div className="p-4 h-full flex flex-col text-white">
              <div className="flip-hint">
                <RotateCcw className="w-3 h-3" />
              </div>

              <div className="retro-title text-center mb-4 text-sm">TRACK_METADATA.JSON</div>

              <div className="flex-1 overflow-y-auto space-y-3">
                {/* Track Info */}
                <div className="metadata-section">
                  <div className="metadata-label">TRACK_INFO</div>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between"><span className="text-gray-400">TITLE:</span><span className="metadata-value">{limitTextToNumberOfCharacters(title || 'Unknown', 15)}</span></div>
                    <div className="flex justify-between"><span className="text-gray-400">ARTIST:</span><span className="metadata-value">{limitTextToNumberOfCharacters(artist || 'Unknown', 15)}</span></div>
                    <div className="flex justify-between"><span className="text-gray-400">TRACK_ID:</span><span className="metadata-value">{trackId?.slice(0, 8)}...</span></div>
                  </div>
                </div>

                {/* Chain Info */}
                <div className="metadata-section">
                  <div className="metadata-label">BLOCKCHAIN_DATA</div>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between"><span className="text-gray-400">CHAIN:</span><span className="metadata-value">{chainNames[chainId || 137] || 'Polygon'}</span></div>
                    <div className="flex justify-between"><span className="text-gray-400">TOKEN:</span><span className="metadata-value">{tokenSymbol ? getDisplaySymbol(tokenSymbol as Token) : 'POL'}</span></div>
                    <div className="flex justify-between"><span className="text-gray-400">PRICE:</span><span className="metadata-value">{trackPrice} {selectedCurrency}</span></div>
                    {bundleId && <div className="flex justify-between"><span className="text-gray-400">BUNDLE:</span><span className="metadata-value">{bundleId.slice(0,8)}...</span></div>}
                  </div>
                </div>

                {/* Stats */}
                <div className="metadata-section">
                  <div className="metadata-label">STATISTICS</div>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between"><span className="text-gray-400">PLAYS:</span><span className="metadata-value">{playbackCount || 0}</span></div>
                    <div className="flex justify-between"><span className="text-gray-400">FAVORITES:</span><span className="metadata-value">{favoriteCount || 0}</span></div>
                    {editionSize && <div className="flex justify-between"><span className="text-gray-400">EDITIONS:</span><span className="metadata-value">{listingCount || 0}/{editionSize}</span></div>}
                    <div className="flex justify-between"><span className="text-gray-400">SALE_TYPE:</span><span className="metadata-value uppercase">{saleType || 'N/A'}</span></div>
                  </div>
                </div>

                {/* Private Asset */}
                {privateAsset && (
                  <div className="metadata-section">
                    <div className="metadata-label">PRIVATE_ASSET</div>
                    <div className="metadata-attribute">{privateAsset}</div>
                  </div>
                )}

                {/* Raw JSON Preview */}
                <div className="metadata-section">
                  <div className="metadata-label">RAW_JSON</div>
                  <div className="metadata-json text-xs">
{`{
  "id": "${trackId}",
  "title": "${title}",
  "artist": "${artist}",
  "chain": "${chainNames[chainId || 137]}",
  "token": "${tokenSymbol ? getDisplaySymbol(tokenSymbol as Token) : 'POL'}",
  "price": ${trackPrice},
  "plays": ${playbackCount || 0},
  "favorites": ${favoriteCount || 0}
}`}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-4 flex gap-2" onClick={(e) => e.stopPropagation()}>
                <Link href={`/tracks/${trackId}`} passHref className="flex-1">
                  <button className="retro-button w-full text-xs py-2">VIEW DETAILS</button>
                </Link>
                <button onClick={() => setIsOgunPrice(!isOgunPrice)} className="soundchain-button-outline px-3 py-2 text-xs">
                  {isOgunPrice ? 'OGUN ✓' : 'OGUN'}
                </button>
              </div>
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
