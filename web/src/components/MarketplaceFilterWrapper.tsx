/* eslint-disable react/display-name */
import { useModalDispatch } from 'contexts/ModalContext';
import { Filter } from 'icons/Filter';
import { GridView as GridViewIcon } from 'icons/GridView';
import { ListView as ListViewIcon } from 'icons/ListView';
import { SortListingItem } from 'lib/apollo/sorting';
import { Dispatch, memo, SetStateAction, useEffect, useState } from 'react';
import { GenreLabel } from 'utils/Genres';
import { SaleTypeLabel } from 'utils/SaleTypeLabel';
import { Badge } from './common/Badges/Badge';
import { FilterComponent } from './Filter/Filter';
import { Token, TOKEN_INFO } from 'constants/tokens';

const categories = ['genres', 'most popular', 'new mints', 'airdrops', 'exclusives'] as const;
type Category = typeof categories[number];

interface FilterWrapperProps {
  totalCount?: number;
  viewMode?: 'grid' | 'list' | 'single';
  setViewMode: Dispatch<SetStateAction<'grid' | 'list' | 'single'>>;
  selectedCategory?: Category;
  setSelectedCategory?: Dispatch<SetStateAction<Category | undefined>>;
  genres?: GenreLabel[];
  setGenres: Dispatch<SetStateAction<GenreLabel[] | undefined>>;
  saleType?: SaleTypeLabel;
  setSaleType: Dispatch<SetStateAction<SaleTypeLabel | undefined>>;
  
  acceptedTokens?: Token[];
  setAcceptedTokens: Dispatch<SetStateAction<Token[] | undefined>>;
  
  chainId?: number;
  setChainId: Dispatch<SetStateAction<number | undefined>>;
  sorting: SortListingItem;
  setSorting: Dispatch<SetStateAction<SortListingItem>>;
  bundleSelections?: string[] | undefined;
  setBundleSelections?: Dispatch<SetStateAction<string[] | undefined>>;
  sweepQueue?: string[];
  setSweepQueue?: (queue: string[]) => void;
  purchaseType?: 'single' | 'sweep' | 'bundle' | undefined;
  setPurchaseType?: Dispatch<SetStateAction<'single' | 'sweep' | 'bundle' | undefined>>;
  transactionFee?: number;
  customBundle?: { nftIds: string[]; tokenSymbol: string; tokenAmount: number; chainId: number; privateAsset?: string }[] | undefined;
  setCustomBundle?: Dispatch<SetStateAction<{ nftIds: string[]; tokenSymbol: string; tokenAmount: number; chainId: number; privateAsset?: string }[] | undefined>>;
  privateAssetOptions: string[];
  className?: string;
}

export const MarketplaceFilterWrapper = memo((props: FilterWrapperProps) => {
  const {
    totalCount,
    viewMode,
    setViewMode,
    selectedCategory,
    setSelectedCategory,
    genres,
    setGenres,
    saleType,
    setSaleType,
    acceptedTokens,
    setAcceptedTokens,
    chainId,
    setChainId,
    sorting,
    setSorting,
    bundleSelections,
    setBundleSelections,
    sweepQueue,
    setSweepQueue,
    purchaseType,
    setPurchaseType,
    transactionFee,
    customBundle,
    setCustomBundle,
    privateAssetOptions,
    className,
  } = props;

  const { dispatchShowFilterMarketplaceModal } = useModalDispatch();
  const [localGenres, setLocalGenres] = useState<GenreLabel[] | undefined>(genres);
  const [localSaleType, setLocalSaleType] = useState<SaleTypeLabel | undefined>(saleType);
  const [localAcceptedTokens, setLocalAcceptedTokens] = useState<Token[] | undefined>(acceptedTokens);
  const [localChainId, setLocalChainId] = useState<number | undefined>(chainId);
  const [localSorting, setLocalSorting] = useState<SortListingItem>(sorting);
  const [localViewMode, setLocalViewMode] = useState<'grid' | 'list' | 'single'>(viewMode || 'grid');
  const [localSelectedCategory, setLocalSelectedCategory] = useState<Category | undefined>(selectedCategory);
  const [localBundleSelections, setLocalBundleSelections] = useState<string[] | undefined>(bundleSelections);
  const [localPurchaseType, setLocalPurchaseType] = useState<'single' | 'sweep' | 'bundle' | undefined>(purchaseType);
  const [localCustomBundle, setLocalCustomBundle] = useState<{ nftIds: string[]; tokenSymbol: string; tokenAmount: number; chainId: number; privateAsset?: string }[] | undefined>(customBundle);

  useEffect(() => {
    setGenres(localGenres);
    setSaleType(localSaleType);
    setAcceptedTokens?.(localAcceptedTokens);
    setChainId(localChainId);
    setSorting(localSorting);
    setViewMode(localViewMode);
    setSelectedCategory?.(localSelectedCategory);
    setBundleSelections?.(localBundleSelections);
    setPurchaseType?.(localPurchaseType);
    setCustomBundle?.(localCustomBundle);
  }, [
    localGenres, localSaleType, localAcceptedTokens, localChainId, localSorting,
    localViewMode, localSelectedCategory, localBundleSelections, localPurchaseType, localCustomBundle,
    setGenres, setSaleType, setAcceptedTokens, setChainId, setSorting, setViewMode,
    setSelectedCategory, setBundleSelections, setPurchaseType, setCustomBundle,
  ]);

  const toggleToken = (token: Token) => {
    setLocalAcceptedTokens(prev => {
      if (!prev) return [token];
      if (prev.includes(token)) {
        return prev.filter(t => t !== token);
      }
      return [...prev, token];
    });
  };

  return (
    <div className={className}>
      <div className="flex flex-col w-full">
        <div className="flex overflow-x-auto space-x-2 p-2 bg-gray-200">
          {categories.map((category) => (
            <button
              key={category}
              className={`px-4 py-2 rounded ${localSelectedCategory === category ? 'bg-blue-500 text-white' : 'bg-gray-300'}`}
              onClick={() => setLocalSelectedCategory(category)}
            >
              {category}
            </button>
          ))}
        </div>
        <div className="flex w-full items-center justify-center gap-2 bg-gray-15 p-4">
          <div className="flex-1">
            <span className="text-sm font-bold text-white">{`${totalCount || 0} `}</span>
            <span className="text-sm text-gray-80">Tracks</span>
          </div>
          <button
            className="hidden items-center justify-center p-2 md:flex"
            onClick={() => dispatchShowFilterMarketplaceModal({
              show: true,
              genres: localGenres,
              saleType: localSaleType,
              acceptedTokens: localAcceptedTokens,
              bundleSelections: localBundleSelections,
              purchaseType: localPurchaseType,
              customBundle: localCustomBundle,
            })}
          >
            <Filter />
            <span className="pl-1 text-xs font-bold text-white">Filter</span>
          </button>
          <FilterComponent sorting={localSorting} setSorting={setLocalSorting} />
          <button aria-label="List view">
            <ListViewIcon color={localViewMode === 'list' ? 'rainbow' : undefined} onClick={() => setLocalViewMode('list')} />
          </button>
          <button aria-label="Grid view (9 cards)">
            <GridViewIcon color={localViewMode === 'grid' ? 'rainbow' : undefined} onClick={() => setLocalViewMode('grid')} />
          </button>
          <button aria-label="Single NFT view">
            <ListViewIcon color={localViewMode === 'single' ? 'rainbow' : undefined} onClick={() => setLocalViewMode('single')} />
          </button>
        </div>
      </div>
      <div className="flex w-full items-center justify-between gap-2 bg-black p-2 md:hidden">
        <button
          className="flex items-center justify-center p-2"
          onClick={() => dispatchShowFilterMarketplaceModal({
            show: true,
            genres: localGenres,
            saleType: localSaleType,
            acceptedTokens: localAcceptedTokens,
            bundleSelections: localBundleSelections,
            purchaseType: localPurchaseType,
            customBundle: localCustomBundle,
          })}
        >
          <Filter />
          <span className="pl-1 text-xs font-bold text-white">Filter</span>
        </button>
        <FilterComponent sorting={localSorting} setSorting={setLocalSorting} mobile noMarginRight />
      </div>
      {(localSaleType || Boolean(localGenres?.length) || localAcceptedTokens?.length || localBundleSelections?.length || localPurchaseType || localCustomBundle?.length) && (
        <div className="flex flex-wrap gap-2 p-4">
          {localSaleType && (
            <Badge
              label={localSaleType.label}
              onDelete={() => setLocalSaleType(undefined)}
            />
          )}
          {localGenres?.map(genre => (
            <Badge
              key={genre.key}
              label={genre.label}
              onDelete={() => {
                const newGenres = localGenres.filter(it => it !== genre);
                setLocalGenres(newGenres);
              }}
            />
          ))}
          {localAcceptedTokens?.map(token => (
            <Badge
              key={token}
              label={TOKEN_INFO[token].name}
              onDelete={() => toggleToken(token)}
            />
          ))}
        </div>
      )}
    </div>
  );
});