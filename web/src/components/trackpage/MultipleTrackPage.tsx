import { BackButton } from 'components/Buttons/BackButton';
import { BuyNowEditionListItem } from 'components/BuyNowEditionListItem';
import { Description } from 'components/details-NFT/Description';
import { HandleNFT } from 'components/details-NFT/HandleNFT';
import { MintingData } from 'components/details-NFT/MintingData';
import { TrackInfo } from 'components/details-NFT/TrackInfo';
import { ViewPost } from 'components/details-NFT/ViewPost';
import { InfiniteLoader } from 'components/InfiniteLoader';
import { NoResultFound } from 'components/NoResultFound';
import SEO from 'components/SEO';
import { TopNavBarProps } from 'components/TopNavBar';
import { Track } from 'components/Track';
import { TrackShareButton } from 'components/TrackShareButton';
import useBlockchain from 'hooks/useBlockchain';
import { useLayoutContext } from 'hooks/useLayoutContext';
import { useMe } from 'hooks/useMe';
import { useTokenOwner } from 'hooks/useTokenOwner';
import { useWalletContext } from 'hooks/useWalletContext';
import { Cards } from 'icons/Cards';
import { PriceTag } from 'icons/PriceTag';
import { SelectToApolloQuery, SortListingItem } from 'lib/apollo/sorting';
import { PendingRequest, TrackQuery, useBuyNowListingItemsQuery, useProfileLazyQuery } from 'lib/graphql';
import { useEffect, useMemo, useState } from 'react';
import { compareWallets } from 'utils/Wallet';

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

  const { setTopNavBarProps } = useLayoutContext();
  const [royalties, setRoyalties] = useState<number>();
  const { getRoyalties } = useBlockchain();
  const { loading: isLoadingOwner, isOwner } = useTokenOwner(track.nftData?.tokenId, track.nftData?.contract);

  const {
    data,
    fetchMore,
    loading: loadingListingItem,
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
  const nftData = track.nftData;
  const tokenId = nftData?.tokenId;

  const firstListingItem = data?.buyNowListingItems?.nodes?.[0]?.listingItem;

  const mintingPending = nftData?.pendingRequest === PendingRequest.Mint;
  const isProcessing = nftData?.pendingRequest != PendingRequest.None;
  const canList = (me?.profile.verified && nftData?.minter === account) || nftData?.minter != account;
  const isBuyNow = Boolean(firstListingItem?.pricePerItem);

  const price = firstListingItem?.pricePerItemToShow || 0;
  const auctionIsOver = (firstListingItem?.endingTime || 0) < Math.floor(Date.now() / 1000);
  const canComplete = compareWallets(account, firstListingItem?.owner);
  const startingDate = firstListingItem?.startingTime ? new Date(firstListingItem?.startingTime * 1000) : undefined;
  const endingDate = firstListingItem?.endingTime ? new Date(firstListingItem?.endingTime * 1000) : undefined;
  const loading = loadingListingItem || isLoadingOwner;

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

  useEffect(() => {
    setTopNavBarProps(topNavBarProps);
  }, [setTopNavBarProps, topNavBarProps]);

  useEffect(() => {
    const fetchRoyalties = async () => {
      if (!account || !web3 || tokenId === null || tokenId === undefined || royalties != undefined) {
        return;
      }
      const royaltiesFromBlockchain = await getRoyalties(web3, tokenId, { nft: nftData?.contract });
      setRoyalties(royaltiesFromBlockchain);
    };
    fetchRoyalties();
  }, [account, web3, tokenId, getRoyalties, royalties, nftData?.contract]);

  useEffect(() => {
    if (track.artistProfileId) {
      profile({ variables: { id: track.artistProfileId } });
    }
  }, [track.artistProfileId, profile]);

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
        <Description description={track.description || ''} className="p-4" />
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
        <div>{nftData && <MintingData transactionHash={nftData.transactionHash} ipfsCid={nftData.ipfsCid} />}</div>
        <section>
          <h3 className="flex items-center gap-2 px-4 py-4 font-bold text-gray-80">
            <PriceTag fill="#808080" />
            <p>Listings</p>
          </h3>
          {!loadingListingItem && (
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
      </div>
      {me &&
        (isProcessing && !mintingPending && nftData?.pendingRequest ? (
          <div className=" flex items-center justify-center p-3">
            <div className="h-5 w-5 animate-spin rounded-full border-t-2 border-white" />
            <div className="pl-3 text-sm font-bold text-white">
              Processing {pendingRequestMapping[nftData.pendingRequest]}
            </div>
          </div>
        ) : loading ? (
          <div className=" flex items-center justify-center">
            <div className="h-5 w-5 animate-spin rounded-full border-t-2 border-white" />
            <div className="pl-3 text-sm font-bold text-white">Loading</div>
          </div>
        ) : (
          <HandleNFT
            canList={canList}
            price={price}
            isOwner={isOwner}
            isBuyNow={isBuyNow}
            isAuction={false}
            canComplete={canComplete}
            auctionIsOver={auctionIsOver}
            countBids={0}
            startingDate={startingDate}
            endingDate={endingDate}
            auctionId={''}
            multipleEdition={true}
          />
        ))}
    </>
  );
};
