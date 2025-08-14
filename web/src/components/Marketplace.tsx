/* eslint-disable react/display-name */
import { GridView } from 'components/GridView/GridView';
import { ListView } from 'components/ListView';
import { useModalState, useModalDispatch } from 'contexts/providers/modal';
import { SelectToApolloQuery, SortListingItem } from 'lib/apollo/sorting';
import { SaleType, Track, useListingItemsQuery } from 'lib/graphql';
import { useCallback, useEffect, useState, useRef } from 'react';
import { GenreLabel } from 'utils/Genres';
import { SaleTypeLabel } from 'utils/SaleTypeLabel';
import { MarketplaceFilterWrapper } from './MarketplaceFilterWrapper';
import { EthereumProvider } from '@walletconnect/ethereum-provider';
import { SingleIcon } from 'icons/SingleIcon'; // Retained for future use
import { SweepIcon } from 'icons/SweepIcon'; // Retained for future use
import { BundleIcon } from 'icons/BundleIcon'; // Retained for future use
import TokenCard from './TokenCard';
import BundleCard from './BundleCard';
import { createPublicClient, http } from 'viem';
import { zetachain, polygon } from 'viem/chains';
import axios from 'axios';

interface ListingItem {
  saleType?: SaleType | undefined;
  acceptsMATIC?: boolean | undefined;
  acceptsOGUN?: boolean | undefined;
  acceptsETH?: boolean | undefined;
  acceptsUSDC?: boolean | undefined;
  acceptsUSDT?: boolean | undefined;
  acceptsSOL?: boolean | undefined;
  acceptsBNB?: boolean | undefined;
  acceptsDOGE?: boolean | undefined;
  acceptsBONK?: boolean | undefined;
  acceptsMEATEOR?: boolean | undefined;
  acceptsPEPE?: boolean | undefined;
  acceptsBASE?: boolean | undefined;
  acceptsXTZ?: boolean | undefined;
  acceptsAVAX?: boolean | undefined;
  acceptsSHIB?: boolean | undefined;
  acceptsXRP?: boolean | undefined;
  acceptsSUI?: boolean | undefined;
  acceptsHBAR?: boolean | undefined;
  acceptsLINK?: boolean | undefined;
  acceptsLTC?: boolean | undefined;
  acceptsZETA?: boolean | undefined;
  acceptsBTC?: boolean | undefined;
  acceptsPENGU?: boolean | undefined;
  chainId?: number | undefined;
  tokenAmount?: number;
  tokenSymbol?: string;
  bundleId?: string;
  privateAsset?: string;
  price?: number;
  [key: string]: boolean | undefined | number | string;
}

type CryptoProps = {
  [K in `accepts${string}`]: boolean | undefined;
} & {
  [K in `setAccepts${string}`]: (value: boolean | undefined) => void;
};

const cryptoCurrencies = [
  'MATIC', 'OGUN', 'ETH', 'USDC', 'USDT', 'SOL', 'BNB', 'DOGE', 'BONK',
  'MEATEOR', 'PEPE', 'BASE', 'XTZ', 'AVAX', 'SHIB', 'XRP', 'SUI', 'HBAR',
  'LINK', 'LTC', 'ZETA', 'BTC', 'PENGU'
];

const privateAssetOptions = ['homes', 'cars', 'clothing', 'vinyl', 'concert tickets', 'movie tickets', 'sporting event tickets'];

const mockConversionRates: { [token: string]: number } = {
  MATIC: 0.50, OGUN: 10.00, ETH: 2000.00, USDC: 1.00, USDT: 1.00, SOL: 150.00,
  BNB: 300.00, DOGE: 0.10, BONK: 0.00001, MEATEOR: 0.50, PEPE: 0.000001,
  BASE: 1.00, XTZ: 1.50, AVAX: 20.00, SHIB: 0.00000001, XRP: 0.50, SUI: 1.00,
  HBAR: 0.05, LINK: 15.00, LTC: 70.00, ZETA: 1.00, BTC: 60000.00, PENGU: 2.00
};

const getContractAddress = (token: string, chainId: number | undefined): string => {
  const addresses: { [key: string]: { [key: number]: string } } = {
    MATIC: { 137: '0x0000000000000000000000000000000000001010' },
    OGUN: { 1: '0x123...' },
    ETH: { 1: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE' },
    USDC: { 137: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174' },
    USDT: { 137: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F' },
    ZETA: { 7000: '0x111...' },
    PENGU: { 1: '0x456...' },
  };
  return addresses[token]?.[chainId as number] || '0x0000000000000000000000000000000000000000';
};

const convertToUSD = (price: number | undefined, tokenSymbol: string | undefined): number => {
  if (!price || !tokenSymbol) return 0;
  return price * (mockConversionRates[tokenSymbol] || 1);
};

const buildMarketplaceFilter = (
  genres: GenreLabel[] | undefined,
  saleType: SaleTypeLabel | undefined,
  cryptoStates: Record<string, boolean | undefined>,
  chainId: number | undefined,
  bundleSelections: string[] | undefined,
  purchaseType: 'single' | 'sweep' | 'bundle' | undefined,
  transactionFee: number | undefined,
  customBundle?: { nftIds: string[]; tokenSymbol: string; tokenAmount: number; chainId: number; privateAsset?: string }[],
) => {
  const listingItem: Partial<ListingItem> = {
    ...Object.fromEntries(cryptoCurrencies.map(crypto => [`accepts${crypto}`, undefined])),
  };
  if (saleType) listingItem.saleType = saleType.key;
  cryptoCurrencies.forEach(crypto => {
    const value = cryptoStates[`accepts${crypto}`];
    if (value === true) {
      listingItem[`accepts${crypto}`] = true;
    }
  });
  if (chainId) listingItem.chainId = chainId;

  return {
    ...(genres?.length && { genres: genres.map(genre => genre.key) }),
    ...(Object.keys(listingItem).length > 0 && { listingItem }),
    ...(bundleSelections?.length && { bundleIds: bundleSelections }),
    ...(purchaseType && { purchaseType }),
    ...(transactionFee && transactionFee > 0 && { transactionFee }),
    ...(customBundle?.length && { customBundles: customBundle }),
  };
};

const fetchAggregatorData = async (chainId: number | undefined): Promise<{ [token: string]: number }> => {
  const apiKey = chainId === 137 ? '-6cS3AFE-iS1ZCnh-bNLQGRM1Gif9t-8' : 'hjUDQMyFJcZP2cTLKW2iy';
  const chain = chainId === 137 ? polygon : zetachain;
  const client = createPublicClient({
    chain,
    transport: http(`https://${chainId === 137 ? 'polygon-mainnet' : 'zetachain-mainnet'}.g.alchemy.com/v2/${apiKey}`),
  });

  try {
    const block = await client.getBlock({ blockNumber: BigInt('latest') });
    console.log(`${chain.name} Latest Block:`, block.number, block.timestamp);

    const contractAddresses = cryptoCurrencies.map(token => getContractAddress(token, chainId));
    const priceResponse = await axios.post(`https://${chainId === 137 ? 'polygon-mainnet' : 'zetachain-mainnet'}.g.alchemy.com/v2/${apiKey}`, {
      jsonrpc: '2.0',
      method: 'alchemy_getTokenMetadata',
      params: [contractAddresses],
      id: 1,
    });
    const prices = priceResponse.data.result;
    const rates = prices.reduce((acc, token) => {
      acc[token.symbol] = token.price || mockConversionRates[token.symbol] || 1;
      return acc;
    }, {} as { [token: string]: number });

    return { ...rates, ...mockConversionRates };
  } catch (error) {
    console.error('Aggregator API error:', error);
    return { ...mockConversionRates };
  }
};

const handleList = (bundle: { nftIds: string[]; tokenSymbol: string; tokenAmount: number; chainId: number; privateAsset?: string }) => {
  const listBundle = async () => {
    const provider = await walletConnect;
    try {
      await provider.enable();
      const metadata = { signature: 'placeholder_signature', ...bundle };
      console.log('Listing bundle with WalletConnect:', metadata);
      dispatch({ type: 'UPDATE_CUSTOM_BUNDLE', payload: [bundle] });
      dispatch({ type: 'UPDATE_TRANSACTION_STATUS', payload: { [bundle.chainId]: 'pending' } });
    } catch (error) {
      console.error('WalletConnect listing error:', error);
      dispatch({ type: 'UPDATE_TRANSACTION_STATUS', payload: { [bundle.chainId]: 'failed' } });
    }
  };
  listBundle();
};

const calculateFee = useCallback((listings: ListingItem[] | undefined) => {
  const visibleListings = listings?.slice(0, pageSize) || [];
  const totalUSDValue = visibleListings.reduce((sum, item) => sum + convertToUSD(item.price, item.tokenSymbol), 0) || 0;
  return totalUSDValue * 0.0005; // 0.05% fee
}, [pageSize]);

export const Marketplace = () => {
  const pageSize = 9;
  const {
    genres: genresFromModal,
    filterSaleType,
    acceptsMATIC: filterAcceptsMATIC,
    acceptsOGUN: filterAcceptsOGUN,
    acceptsETH: filterAcceptsETH,
    acceptsUSDC: filterAcceptsUSDC,
    acceptsUSDT: filterAcceptsUSDT,
    acceptsSOL: filterAcceptsSOL,
    acceptsBNB: filterAcceptsBNB,
    acceptsDOGE: filterAcceptsDOGE,
    acceptsBONK: filterAcceptsBONK,
    acceptsMEATEOR: filterAcceptsMEATEOR,
    acceptsPEPE: filterAcceptsPEPE,
    acceptsBASE: filterAcceptsBASE,
    acceptsXTZ: filterAcceptsXTZ,
    acceptsAVAX: filterAcceptsAVAX,
    acceptsSHIB: filterAcceptsSHIB,
    acceptsXRP: filterAcceptsXRP,
    acceptsSUI: filterAcceptsSUI,
    acceptsHBAR: filterAcceptsHBAR,
    acceptsLINK: filterAcceptsLINK,
    acceptsLTC: filterAcceptsLTC,
    acceptsZETA: filterAcceptsZETA,
    acceptsBTC: filterAcceptsBTC,
    acceptsPENGU: filterAcceptsPENGU,
    transactionStatus,
    bundleSelections,
    sweepQueue,
    purchaseType,
    transactionFee,
    customBundle,
  } = useModalState();
  const dispatch = useModalDispatch();
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'single'>('grid');
  const [genres, setGenres] = useState<GenreLabel[] | undefined>(genresFromModal);
  const [saleType, setSaleType] = useState<SaleTypeLabel | undefined>(filterSaleType);
  const [cryptoStates, setCryptoStates] = useState<Record<string, boolean | undefined>>({
    acceptsMATIC: filterAcceptsMATIC,
    acceptsOGUN: filterAcceptsOGUN,
    acceptsETH: filterAcceptsETH,
    acceptsUSDC: filterAcceptsUSDC,
    acceptsUSDT: filterAcceptsUSDT,
    acceptsSOL: filterAcceptsSOL,
    acceptsBNB: filterAcceptsBNB,
    acceptsDOGE: filterAcceptsDOGE,
    acceptsBONK: filterAcceptsBONK,
    acceptsMEATEOR: filterAcceptsMEATEOR,
    acceptsPEPE: filterAcceptsPEPE,
    acceptsBASE: filterAcceptsBASE,
    acceptsXTZ: filterAcceptsXTZ,
    acceptsAVAX: filterAcceptsAVAX,
    acceptsSHIB: filterAcceptsSHIB,
    acceptsXRP: filterAcceptsXRP,
    acceptsSUI: filterAcceptsSUI,
    acceptsHBAR: filterAcceptsHBAR,
    acceptsLINK: filterAcceptsLINK,
    acceptsLTC: filterAcceptsLTC,
    acceptsZETA: filterAcceptsZETA,
    acceptsBTC: filterAcceptsBTC,
    acceptsPENGU: filterAcceptsPENGU,
  });
  const [chainId, setChainId] = useState<number | undefined>(undefined);
  const [sorting, setSorting] = useState<SortListingItem>(SortListingItem.CreatedAt);
  const [selectedBundle, setSelectedBundle] = useState<string[] | undefined>(bundleSelections);
  const [customBundleState, setCustomBundleState] = useState<{ nftIds: string[]; tokenSymbol: string; tokenAmount: number; chainId: number; privateAsset?: string }[] | undefined>(customBundle);
  const lastCardRef = useRef<HTMLDivElement>(null);

  const projectId = 'YOUR_WALLETCONNECT_PROJECT_ID';
  const chains = [1, 137, 7000, 56, 8453, 43114, 101, 250, 1284, 25, 100, 128, 1442, 784, 415, 60, 2, 1839];
  const walletConnect = (async () => await EthereumProvider.init({
    projectId,
    chains,
    optionalChains: chains,
    showQrModal: true,
  }))();

  const handlePurchaseTypeChange = (type: 'single' | 'sweep' | 'bundle') => {
    dispatch({ type: 'UPDATE_PURCHASE_TYPE', payload: type });
  };

  useEffect(() => {
    const initWalletConnect = async () => {
      try {
        const provider = await walletConnect;
        const networkId = parseInt(provider.chainId);
        setChainId(networkId);
      } catch (error) {
        console.error('WalletConnect error:', error);
      }
    };
    initWalletConnect();
  }, [walletConnect]);

  useEffect(() => {
    setCryptoStates({
      acceptsMATIC: filterAcceptsMATIC,
      acceptsOGUN: filterAcceptsOGUN,
      acceptsETH: filterAcceptsETH,
      acceptsUSDC: filterAcceptsUSDC,
      acceptsUSDT: filterAcceptsUSDT,
      acceptsSOL: filterAcceptsSOL,
      acceptsBNB: filterAcceptsBNB,
      acceptsDOGE: filterAcceptsDOGE,
      acceptsBONK: filterAcceptsBONK,
      acceptsMEATEOR: filterAcceptsMEATEOR,
      acceptsPEPE: filterAcceptsPEPE,
      acceptsBASE: filterAcceptsBASE,
      acceptsXTZ: filterAcceptsXTZ,
      acceptsAVAX: filterAcceptsAVAX,
      acceptsSHIB: filterAcceptsSHIB,
      acceptsXRP: filterAcceptsXRP,
      acceptsSUI: filterAcceptsSUI,
      acceptsHBAR: filterAcceptsHBAR,
      acceptsLINK: filterAcceptsLINK,
      acceptsLTC: filterAcceptsLTC,
      acceptsZETA: filterAcceptsZETA,
      acceptsBTC: filterAcceptsBTC,
      acceptsPENGU: filterAcceptsPENGU,
    });
    setGenres(genresFromModal);
    setSaleType(filterSaleType);
    const fee = calculateFee(data?.listingItems.nodes);
    dispatch({ type: 'SET_TRANSACTION_FEE', payload: fee });
  }, [
    filterAcceptsMATIC, filterAcceptsOGUN, filterAcceptsETH, filterAcceptsUSDC,
    filterAcceptsUSDT, filterAcceptsSOL, filterAcceptsBNB, filterAcceptsDOGE,
    filterAcceptsBONK, filterAcceptsMEATEOR, filterAcceptsPEPE, filterAcceptsBASE,
    filterAcceptsXTZ, filterAcceptsAVAX, filterAcceptsSHIB, filterAcceptsXRP,
    filterAcceptsSUI, filterAcceptsHBAR, filterAcceptsLINK, filterAcceptsLTC,
    filterAcceptsZETA, filterAcceptsBTC, filterAcceptsPENGU, genresFromModal,
    filterSaleType, data?.listingItems.nodes, dispatch, calculateFee,
  ]);

  const { data, refetch, fetchMore, loading } = useListingItemsQuery({
    variables: { page: { first: pageSize }, sort: SelectToApolloQuery[sorting], filter: {} },
    ssr: false,
  });

  const loadMore = useCallback(() => {
    fetchMore({
      variables: {
        page: { first: pageSize, after: data?.listingItems.pageInfo.endCursor },
        sort: SelectToApolloQuery[sorting],
        filter: buildMarketplaceFilter(genres, saleType, cryptoStates, chainId, selectedBundle, purchaseType, transactionFee, customBundleState),
      },
    });
  }, [data?.listingItems.pageInfo.endCursor, sorting, genres, saleType, cryptoStates, chainId, fetchMore, selectedBundle, purchaseType, transactionFee, customBundleState]);

  useEffect(() => {
    refetch({
      page: { first: pageSize },
      sort: SelectToApolloQuery[sorting],
      filter: buildMarketplaceFilter(genres, saleType, cryptoStates, chainId, selectedBundle, purchaseType, transactionFee, customBundleState),
    });
  }, [genres, saleType, cryptoStates, chainId, sorting, refetch, selectedBundle, purchaseType, transactionFee, customBundleState]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && data?.listingItems.pageInfo.hasNextPage && !loading) {
          loadMore();
        }
      },
      { threshold: 1 },
    );
    if (lastCardRef.current) observer.observe(lastCardRef.current);
    return () => observer.disconnect();
  }, [data?.listingItems.pageInfo.hasNextPage, loading, loadMore]);

  const tokenListings = [
    { tokenSymbol: 'MATIC', tokenAmount: 5, chainId: 137, price: 0.5, usdPrice: convertToUSD(0.5, 'MATIC') },
    { tokenSymbol: 'OGUN', tokenAmount: 3, chainId: 1, price: 10, usdPrice: convertToUSD(10, 'OGUN') },
    { tokenSymbol: 'PENGU', tokenAmount: 7, chainId: 1, price: 2, usdPrice: convertToUSD(2, 'PENGU') },
    { tokenSymbol: 'ETH', tokenAmount: 1, chainId: 1, price: 2000, usdPrice: convertToUSD(2000, 'ETH') },
    { tokenSymbol: 'USDC', tokenAmount: 100, chainId: 1, price: 100, usdPrice: convertToUSD(100, 'USDC') },
    { tokenSymbol: 'USDT', tokenAmount: 100, chainId: 1, price: 100, usdPrice: convertToUSD(100, 'USDT') },
    { tokenSymbol: 'SOL', tokenAmount: 1, chainId: 101, price: 150, usdPrice: convertToUSD(150, 'SOL') },
    { tokenSymbol: 'BNB', tokenAmount: 1, chainId: 56, price: 300, usdPrice: convertToUSD(300, 'BNB') },
    { tokenSymbol: 'DOGE', tokenAmount: 1000, chainId: 250, price: 0.1, usdPrice: convertToUSD(0.1, 'DOGE') },
    { tokenSymbol: 'BONK', tokenAmount: 1000000, chainId: 250, price: 0.00001, usdPrice: convertToUSD(0.00001, 'BONK') },
    { tokenSymbol: 'MEATEOR', tokenAmount: 50, chainId: 25, price: 0.5, usdPrice: convertToUSD(0.5, 'MEATEOR') },
    { tokenSymbol: 'PEPE', tokenAmount: 1000000, chainId: 100, price: 0.000001, usdPrice: convertToUSD(0.000001, 'PEPE') },
    { tokenSymbol: 'BASE', tokenAmount: 10, chainId: 8453, price: 1, usdPrice: convertToUSD(1, 'BASE') },
    { tokenSymbol: 'XTZ', tokenAmount: 10, chainId: 1284, price: 1.5, usdPrice: convertToUSD(1.5, 'XTZ') },
    { tokenSymbol: 'AVAX', tokenAmount: 5, chainId: 43114, price: 20, usdPrice: convertToUSD(20, 'AVAX') },
    { tokenSymbol: 'SHIB', tokenAmount: 1000000000, chainId: 128, price: 0.00000001, usdPrice: convertToUSD(0.00000001, 'SHIB') },
    { tokenSymbol: 'XRP', tokenAmount: 100, chainId: 1442, price: 0.50, usdPrice: convertToUSD(0.50, 'XRP') },
    { tokenSymbol: 'SUI', tokenAmount: 10, chainId: 784, price: 1, usdPrice: convertToUSD(1, 'SUI') },
    { tokenSymbol: 'HBAR', tokenAmount: 200, chainId: 415, price: 0.05, usdPrice: convertToUSD(0.05, 'HBAR') },
    { tokenSymbol: 'LINK', tokenAmount: 10, chainId: 60, price: 15, usdPrice: convertToUSD(15, 'LINK') },
    { tokenSymbol: 'LTC', tokenAmount: 1, chainId: 2, price: 70, usdPrice: convertToUSD(70, 'LTC') },
    { tokenSymbol: 'ZETA', tokenAmount: 100, chainId: 7000, price: 1, usdPrice: convertToUSD(1, 'ZETA') },
    { tokenSymbol: 'BTC', tokenAmount: 0.01, chainId: 1839, price: 60000, usdPrice: convertToUSD(60000, 'BTC') },
  ];
  const bundleListings = [
    { nftIds: ['nft1', 'nft2'], tokenSymbol: 'ETH', tokenAmount: 10, chainId: 1, privateAsset: 'concert tickets', price: 2000, usdPrice: convertToUSD(2000, 'ETH') },
  ];

  return (
    <>
      <MarketplaceFilterWrapper
        totalCount={data?.listingItems.pageInfo.totalCount}
        viewMode={viewMode}
        setViewMode={setViewMode}
        genres={genres}
        setGenres={setGenres}
        {...cryptoCurrencies.reduce((acc, crypto) => ({
          ...acc,
          [`accepts${crypto}`]: cryptoStates[`accepts${crypto}`],
          [`setAccepts${crypto}`]: (value: boolean | undefined) =>
            setCryptoStates(prev => ({ ...prev, [`accepts${crypto}`]: value })),
        }), {} as CryptoProps)}
        chainId={chainId}
        setChainId={setChainId}
        sorting={sorting}
        setSorting={setSorting}
        bundleSelections={selectedBundle}
        setBundleSelections={setSelectedBundle}
        sweepQueue={sweepQueue}
        setSweepQueue={(queue: string[]) => dispatch({ type: 'UPDATE_SWEEP_QUEUE', payload: queue })}
        purchaseType={purchaseType}
        setPurchaseType={handlePurchaseTypeChange}
        transactionFee={transactionFee}
        customBundle={customBundleState}
        setCustomBundle={setCustomBundleState}
        privateAssetOptions={privateAssetOptions}
        className="sm:flex-col md:flex-row"
      />
      {viewMode === 'grid' ? (
        <GridView
          tracks={data?.listingItems.nodes as Track[]}
          loading={loading}
          refetch={refetch}
          hasNextPage={data?.listingItems.pageInfo.hasNextPage}
          loadMore={loadMore}
          lastCardRef={lastCardRef}
          className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4"
        >
          {tokenListings.map((token, index) => (
            <TokenCard
              key={`token-${index}`}
              tokenSymbol={token.tokenSymbol}
              tokenAmount={token.tokenAmount}
              chainId={token.chainId}
              price={token.price}
              usdPrice={token.usdPrice}
            />
          ))}
          {bundleListings.map((bundle, index) => (
            <BundleCard
              key={`bundle-${index}`}
              nftIds={bundle.nftIds}
              tokenSymbol={bundle.tokenSymbol}
              tokenAmount={bundle.tokenAmount}
              chainId={bundle.chainId}
              privateAsset={bundle.privateAsset}
              onList={handleList}
              privateAssetOptions={privateAssetOptions}
              price={bundle.price}
              usdPrice={bundle.usdPrice}
              className="sm:w-full md:w-1/3"
            />
          ))}
        </GridView>
      ) : (
        <ListView
          tracks={data?.listingItems.nodes as Track[]}
          loading={loading}
          refetch={refetch}
          hasNextPage={data?.listingItems.pageInfo.hasNextPage}
          loadMore={loadMore}
          lastCardRef={lastCardRef}
          className="flex flex-col sm:flex-row flex-wrap"
        >
          {tokenListings.map((token, index) => (
            <TokenCard
              key={`token-${index}`}
              tokenSymbol={token.tokenSymbol}
              tokenAmount={token.tokenAmount}
              chainId={token.chainId}
              price={token.price}
              usdPrice={token.usdPrice}
              className="sm:w-full md:w-1/2"
            />
          ))}
          {bundleListings.map((bundle, index) => (
            <BundleCard
              key={`bundle-${index}`}
              nftIds={bundle.nftIds}
              tokenSymbol={bundle.tokenSymbol}
              tokenAmount={bundle.tokenAmount}
              chainId={bundle.chainId}
              privateAsset={bundle.privateAsset}
              onList={handleList}
              privateAssetOptions={privateAssetOptions}
              price={bundle.price}
              usdPrice={bundle.usdPrice}
              className="sm:w-full md:w-1/2"
            />
          ))}
        </ListView>
      )}
      {transactionFee > 0 && (
        <div className="text-white text-center sm:text-left md:text-right">Transaction Fee: ${transactionFee.toFixed(2)}</div>
      )}
    </>
  );
};
