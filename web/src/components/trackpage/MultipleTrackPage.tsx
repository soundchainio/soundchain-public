import { ObservableQuery } from '@apollo/client';
import { BackButton } from 'components/Buttons/BackButton';
import { BuyNowEditionListItem } from 'components/BuyNowEditionListItem';
import { Description } from 'components/details-NFT/Description';
import { HandleMultipleEditionNFT } from 'components/details-NFT/HandleMultipleEditionNFT';
import { MintingData } from 'components/details-NFT/MintingData';
import { TrackInfo } from 'components/details-NFT/TrackInfo';
import { ViewPost } from 'components/details-NFT/ViewPost';
import { InfiniteLoader } from 'components/InfiniteLoader';
import { NoResultFound } from 'components/NoResultFound';
import { OwnedEditionListItem } from 'components/OwnedEditionListItem';
import SEO from 'components/SEO';
import { TopNavBarProps } from 'components/TopNavBar';
import { Track } from 'components/Track';
import { TrackShareButton } from 'components/TrackShareButton';
import { useModalState } from 'contexts/providers/modal';
import { useLayoutContext } from 'hooks/useLayoutContext';
import { useMe } from 'hooks/useMe';
import { useWalletContext } from 'hooks/useWalletContext';
import { Cards } from 'icons/Cards';
import { PriceTag } from 'icons/PriceTag';
import { SelectToApolloQuery, SortListingItem } from 'lib/apollo/sorting';
import {
  BuyNowListingItemsQuery,
  BuyNowListingItemsQueryVariables,
  OwnedTracksQuery,
  PendingRequest,
  TrackEdition,
  TrackQuery,
  useBuyNowListingItemsQuery,
  useCheapestListingItemLazyQuery,
  useOwnedTracksQuery,
  useProfileLazyQuery,
  useTrackLazyQuery,
} from 'lib/graphql';
import { useEffect, useMemo, useState } from 'react';
import { Matic } from '../Matic';
import { isPendingRequest } from 'utils/isPendingRequest';
import { UtilityInfo } from '../details-NFT/UtilityInfo';
import useBlockchainV2 from '../../hooks/useBlockchainV2';

interface MultipleTrackPageProps {
  track: TrackQuery['track'];
}

const pendingRequestMapping: Record<PendingRequest, string> = {
  CancelListing: 'cancel listing',
  Buy: 'buy',
  List: 'list',
  Mint: 'mint',
  None: 'none',
  UpdateListing: 'update listing',
  PlaceBid: 'place bid',
  CompleteAuction: 'complete auction',
  CancelAuction: 'cancel auction',
};

export const MultipleTrackPage = ({ track }: MultipleTrackPageProps) => {
  const me = useMe();
  const { account, web3 } = useWalletContext();
  const [profile, { data: profileInfo }] = useProfileLazyQuery();

  const { showRemoveListing } = useModalState();
  const { setTopNavBarProps } = useLayoutContext();
  const [royalties, setRoyalties] = useState<number>();
  const { getEditionRoyalties } = useBlockchainV2()
  const [forceRefresh, setForceRefresh] = useState(false);

  useEffect(() => {
    if (!showRemoveListing) {
      setForceRefresh(true);
    }
  }, [showRemoveListing, setForceRefresh])

  const [refetchTrack, { data: trackData }] = useTrackLazyQuery({
    fetchPolicy: 'network-only',
    nextFetchPolicy: 'network-only',
  });

  const nftData = trackData?.track?.nftData || track.nftData;


  const [fetchCheapestListingItem, {data: cheapestListingItem}] = useCheapestListingItemLazyQuery({
    fetchPolicy: 'network-only',
    nextFetchPolicy: 'network-only',
  })

  const buyNowPrice = cheapestListingItem?.cheapestListingItem

  useEffect(() => {
    if (track.trackEditionId) {
      fetchCheapestListingItem({
        variables: {
          trackEditionId: track.trackEditionId,
        }
      })
    }
  }, [fetchCheapestListingItem, track.trackEditionId])

  const {
    data,
    fetchMore,
    loading: loadingListingItem,
    refetch: refetchListingItem,
  } = useBuyNowListingItemsQuery({
    variables: {
      page: { first: 10 },
      sort: SelectToApolloQuery[SortListingItem.CreatedAt],
      filter: { trackEdition: track.trackEditionId || '' },
    },
    ssr: false,
  });

  const title = `${track.title} - song by ${track.artist} | SoundChain`;
  const description = `Listen to ${track.title} on SoundChain. ${track.artist}. ${track.album || 'Song'}. ${
    track.releaseYear != null ? `${track.releaseYear}.` : ''
  }`;

  const trackEdition = trackData?.track.trackEdition || track.trackEdition;
  const editionData = trackEdition?.editionData
  const tokenId = nftData?.tokenId;


  const firstListingItem = data?.buyNowListingItems?.nodes?.[0]?.listingItem;

  const mintingPending = nftData?.pendingRequest === PendingRequest.Mint;
  const isProcessing = isPendingRequest(nftData?.pendingRequest) || isPendingRequest(editionData?.pendingRequest);
  const canList = (me?.profile.verified && nftData?.minter === account) || nftData?.minter != account;
  const isBuyNow = Boolean(firstListingItem?.pricePerItem);

  const price = firstListingItem?.pricePerItemToShow || 0;
  const startingDate = firstListingItem?.startingTime ? new Date(firstListingItem?.startingTime * 1000) : undefined;
  const endingDate = firstListingItem?.endingTime ? new Date(firstListingItem?.endingTime * 1000) : undefined;
  const loading = loadingListingItem;

  const topNavBarProps: TopNavBarProps = useMemo(
    () => ({
      leftButton: <BackButton />,
      title: 'NFT Details',
      rightButton: (
        <div className="flex items-center gap-3">
          <TrackShareButton trackId={track.id} artist={track.artist} title={track.title} />
        </div>
      ),
    }),
    [track.artist, track.id, track.title],
  );

  const {
    data: ownedTracksData,
    loading: ownedTracksLoading,
    refetch: ownedTracksRefetch,
  } = useOwnedTracksQuery({
    variables: {
      page: { first: 10 },
      filter: { 
        trackEditionId: track.trackEditionId,
        nftData: {
          owner: account,
        }
      },
    },
    fetchPolicy: 'network-only',
    nextFetchPolicy: 'network-only',
    skip: !track.trackEditionId,
    ssr: false,
  });

  useEffect(() => {
    setTopNavBarProps(topNavBarProps);
  }, [setTopNavBarProps, topNavBarProps]);

  const {editionId} = track.trackEdition as TrackEdition
  useEffect(() => {
    const fetchRoyalties = async () => {
      if (!account || !web3 || tokenId === null || editionId === undefined || royalties != undefined) {
        return;
      }
      const royaltiesFromBlockchain = await getEditionRoyalties(web3, editionId);
      setRoyalties(royaltiesFromBlockchain);
    };
    fetchRoyalties();
  }, [account, web3, editionId, getEditionRoyalties, royalties, nftData?.contract]);

  useEffect(() => {
    if (track.artistProfileId) {
      profile({ variables: { id: track.artistProfileId } });
    }
  }, [track.artistProfileId, profile]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (isProcessing || forceRefresh) {
        refetchTrack({ variables: { id: track.id } });
        refetchListingItem();
        ownedTracksRefetch();
        setForceRefresh(false)
      }
    }, 10 * 1000);

    return () => clearInterval(interval);
  }, [isProcessing, refetchTrack, refetchListingItem, ownedTracksRefetch, tokenId, track.id, forceRefresh, setForceRefresh]);

  return (
    <>
      <SEO title={title} description={description} canonicalUrl={`/tracks/${track.id}`} image={track.artworkUrl} />
      <div className="pb-20">
        <div className="flex flex-col gap-5 p-3">
          <Track track={track} />
          <ViewPost trackId={track.id} isFavorited={track.isFavorite} />
        </div>
        <dl className="flex items-center justify-between gap-3 px-4 py-3">
          <dt className="text-xs font-bold uppercase text-white"># of Editions</dt>
          <dd className="flex items-center justify-between gap-2 text-xs font-black text-gray-80">
            <Cards />
            {track.editionSize}
          </dd>
        </dl>
        {buyNowPrice && (
          <div className="bg-[#112011]">
            <div className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="text-xs font-bold text-gray-80">BUY NOW PRICE</div>
              <Matic value={buyNowPrice} variant="currency-inline" className="text-xs" />
            </div>
          </div>
        )}
        <Description description={track.description || ''} className="p-4" />
        <UtilityInfo content={track.utilityInfo || ''} className="px-4 py-2" />
        <TrackInfo
          trackTitle={track.title}
          albumTitle={track.album}
          releaseYear={track.releaseYear}
          genres={track.genres}
          copyright={track.copyright}
          artistProfile={profileInfo?.profile}
          royalties={royalties}
          me={me}
        />
        <div>{nftData && editionData && <MintingData transactionHash={editionData.transactionHash} ipfsCid={nftData.ipfsCid} />}</div>
        <OwnedList data={ownedTracksData} loading={ownedTracksLoading} canList={canList} />
        <Listings data={data} loading={loadingListingItem} fetchMore={fetchMore} />
      </div>
      {me &&
        (isPendingRequest(nftData?.pendingRequest) && !mintingPending && nftData?.pendingRequest ? (
          <div className=" flex items-center justify-center p-3">
            <div className="h-5 w-5 animate-spin rounded-full border-t-2 border-white" />
            <div className="pl-3 text-sm font-bold text-white">
              Processing {pendingRequestMapping[nftData.pendingRequest]}
            </div>
          </div>
        ) : isPendingRequest(editionData?.pendingRequest) && !mintingPending && editionData?.pendingRequest ? (
          <div className=" flex items-center justify-center p-3">
            <div className="h-5 w-5 animate-spin rounded-full border-t-2 border-white" />
            <div className="pl-3 text-sm font-bold text-white">
              Processing {pendingRequestMapping[editionData.pendingRequest]}
            </div>
          </div>
        ) : loading ? (
          <div className=" flex items-center justify-center">
            <div className="h-5 w-5 animate-spin rounded-full border-t-2 border-white" />
            <div className="pl-3 text-sm font-bold text-white">Loading</div>
          </div>
        ) : (
          <HandleMultipleEditionNFT
            canList={canList}
            price={price}
            isMinter={track.nftData?.minter === account}
            isBuyNow={isBuyNow}
            startingDate={startingDate}
            endingDate={endingDate}
            trackEditionId={trackEdition?.id}
            editionId={trackEdition?.editionId}
            isEditionListed={trackEdition?.listed}
            contractAddresses={{
              nft: nftData?.contract,
              marketplace: trackEdition?.marketplace,
            }}
          />
        ))}
    </>
  );
};

interface ListingsProps {
  loading: boolean;
  data?: BuyNowListingItemsQuery;
  fetchMore: ObservableQuery<BuyNowListingItemsQuery, BuyNowListingItemsQueryVariables>['fetchMore'];
}

function Listings(props: ListingsProps) {
  const { data, loading, fetchMore } = props;

  const nodes = data?.buyNowListingItems.nodes;
  const pageInfo = data?.buyNowListingItems.pageInfo;

  const loadMore = () => {
    fetchMore({
      variables: {
        page: {
          first: 10,
          after: pageInfo?.endCursor,
        },
      },
    });
  };

  return (
    <section>
      <h3 className="flex items-center gap-2 px-4 py-4 font-bold text-gray-80">
        <PriceTag fill="#808080" />
        <p>Listings</p>
      </h3>
      {!loading && (
        <>
          <div className="flex h-8 items-center bg-gray-20 px-4 py-2 text-xs font-black text-white">
            <p className="min-w-[140px]">Price</p>
            <p>From</p>
          </div>
          {nodes?.length ? (
            <ol className="text-white">
              {nodes?.map(item => (
                <BuyNowEditionListItem
                  key={item.id}
                  price={item.listingItem?.pricePerItemToShow || 0}
                  owner={item.nftData?.owner || ''}
                  trackId={item.id}
                  tokenId={item.nftData?.tokenId || 0}
                  contractAddress={item.nftData?.contract || ''}
                  isProcessing={
                    isPendingRequest(item.nftData?.pendingRequest) || isPendingRequest(item.trackEdition?.editionData?.pendingRequest)
                  }
                />
              ))}
              {pageInfo?.hasNextPage && <InfiniteLoader loadMore={loadMore} loadingMessage="Loading Tracks" />}
            </ol>
          ) : (
            <NoResultFound />
          )}
        </>
      )}
    </section>
  )
}

interface OwnedListProps {
  loading: boolean;
  canList: boolean;
  data?: OwnedTracksQuery;
}

function OwnedList(props: OwnedListProps) {
  const { data, canList, loading } = props;

  const nodes = data?.tracks.nodes;
  const pageInfo = data?.tracks.pageInfo;

  return (
    <section>
      <h3 className="flex items-center gap-2 px-4 pt-4 font-bold text-gray-80">
        <PriceTag fill="#808080" />
        <p>Owned {pageInfo?.totalCount && <>(total: {pageInfo?.totalCount})</>}</p>
      </h3>
      <div className='text-gray-80 text-xs pl-10 pr-4 pt-1 pb-4'>Showing first 10 tokens</div>
      {!loading && (
        <>
          <div className="flex h-8 items-center bg-gray-20 px-4 py-2 text-xs font-black text-white">
            <p className="min-w-[140px]">ID</p>
          </div>
          {nodes?.length ? (
            <ol className="text-white">
              {nodes?.map(item => (
                <OwnedEditionListItem
                  key={item.id}
                  canList={canList}
                  trackId={item.id}
                  tokenId={item.nftData?.tokenId || 0}
                  listingItem={item.listingItem}
                  isProcessing={
                    isPendingRequest(item.nftData?.pendingRequest) || isPendingRequest(item.trackEdition?.editionData?.pendingRequest)
                  }
                />
              ))}
            </ol>
          ) : (
            <NoResultFound />
          )}
        </>
      )}
    </section>
  )
}