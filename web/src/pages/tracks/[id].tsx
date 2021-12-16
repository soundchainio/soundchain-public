/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { Avatar } from 'components/Avatar';
import { BackButton } from 'components/Buttons/BackButton';
import { Description } from 'components/details-NFT/Description';
import { HandleNFT } from 'components/details-NFT/HandleNFT';
import { MintingData } from 'components/details-NFT/MintingData';
import { TrackInfo } from 'components/details-NFT/TrackInfo';
import { Layout } from 'components/Layout';
import SEO from 'components/SEO';
import { TimeCounter } from 'components/TimeCounter';
import { TopNavBarProps } from 'components/TopNavBar';
import { Track } from 'components/Track';
import { useModalDispatch } from 'contexts/providers/modal';
import useBlockchain from 'hooks/useBlockchain';
import { useMe } from 'hooks/useMe';
import { useWalletContext } from 'hooks/useWalletContext';
import { Matic } from 'icons/Matic';
import { Ellipsis } from 'icons/Ellipsis';
import { cacheFor, createApolloClient } from 'lib/apollo';
import {
  PendingRequest,
  Profile,
  Role,
  TrackDocument,
  TrackQuery,
  useCountBidsLazyQuery,
  useHaveBidedLazyQuery,
  useListingItemLazyQuery,
  useProfileLazyQuery,
  useTrackLazyQuery,
  useUserByWalletLazyQuery,
} from 'lib/graphql';
import { GetServerSideProps } from 'next';
import { useRouter } from 'next/router';
import { ParsedUrlQuery } from 'querystring';
import { useEffect, useState } from 'react';
import { AuthorActionsType } from 'types/AuthorActionsType';
import { HighestBid } from './[id]/complete-auction';

export interface TrackPageProps {
  track: TrackQuery['track'];
}

interface TrackPageParams extends ParsedUrlQuery {
  id: string;
}

export const getServerSideProps: GetServerSideProps<TrackPageProps, TrackPageParams> = async context => {
  const trackId = context.params?.id;

  if (!trackId) {
    return { notFound: true };
  }

  const apolloClient = createApolloClient(context);

  const { data, error } = await apolloClient.query({
    query: TrackDocument,
    variables: { id: trackId },
    context,
  });

  if (error || data.track.deleted) {
    return { notFound: true };
  }

  return cacheFor(TrackPage, { track: data.track }, context, apolloClient);
};

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

export default function TrackPage({ track: initialState }: TrackPageProps) {
  const me = useMe();
  const { account, web3 } = useWalletContext();
  const { isTokenOwner, getRoyalties, getHighestBid } = useBlockchain();
  const [isOwner, setIsOwner] = useState<boolean>(false);
  const [royalties, setRoyalties] = useState<number>();
  const [track, setTrack] = useState<TrackQuery['track']>(initialState);
  const [highestBid, setHighestBid] = useState<HighestBid>({} as HighestBid);
  const [isLoadingOwner, setLoadingOwner] = useState(true);
  const { dispatchShowAuthorActionsModal } = useModalDispatch();

  const [refetchTrack, { data: trackData }] = useTrackLazyQuery({
    fetchPolicy: 'network-only',
    nextFetchPolicy: 'network-only',
  });
  const [fetchCountBids, { data: countBids }] = useCountBidsLazyQuery();
  const [fetchHaveBided, { data: haveBided }] = useHaveBidedLazyQuery();
  const [fetchListingItem, { data: listingPayload, loading: loadingListingItem }] = useListingItemLazyQuery({
    fetchPolicy: 'network-only',
  });
  const [fetchHighestBidder, { data: highestBidderData }] = useUserByWalletLazyQuery();
  const [profile, { data: profileInfo }] = useProfileLazyQuery();
  const [userByWallet, { data: ownerProfile }] = useUserByWalletLazyQuery();

  const nftData = track.nftData;
  const mintingPending = nftData?.pendingRequest === PendingRequest.Mint;
  const isProcessing = nftData?.pendingRequest != PendingRequest.None;
  const tokenId = nftData?.tokenId;
  const canList = (me?.profile.verified && nftData?.minter === account) || nftData?.minter != account;
  const isBuyNow = Boolean(listingPayload?.listingItem?.pricePerItem);
  const isAuction = Boolean(listingPayload?.listingItem?.reservePrice);
  const bidCount = countBids?.countBids.numberOfBids ?? 0;

  const { reservePrice, pricePerItem } = listingPayload?.listingItem || {};

  let priceValue = pricePerItem?.toLocaleString('fullwide', { useGrouping: false });
  if (isAuction) {
    priceValue =
      highestBid.bid === '0' ? reservePrice?.toLocaleString('fullwide', { useGrouping: false }) : highestBid.bid;
  }
  const price = web3?.utils.fromWei(priceValue ?? '0', 'ether');

  const auctionIsOver = (listingPayload?.listingItem?.endingTime || 0) < Math.floor(Date.now() / 1000);
  const canComplete = auctionIsOver && highestBid.bidder?.toLowerCase() === account?.toLowerCase();
  const isHighestBidder = highestBid.bidder ? highestBid.bidder.toLowerCase() === account?.toLowerCase() : undefined;
  const startingDate = listingPayload?.listingItem?.startingTime
    ? new Date(listingPayload.listingItem.startingTime * 1000)
    : undefined;
  const endingDate = listingPayload?.listingItem?.endingTime
    ? new Date(listingPayload.listingItem.endingTime * 1000)
    : undefined;
  const futureSale = startingDate ? startingDate.getTime() > new Date().getTime() : false;
  const loading = loadingListingItem || isLoadingOwner;

  const topNavBarProps: TopNavBarProps = {
    leftButton: <BackButton />,
    title: 'NFT Details',
    rightButton:
      isOwner || me?.roles.includes(Role.Admin) ? (
        <Ellipsis
          className="cursor-pointer"
          onClick={() => dispatchShowAuthorActionsModal(true, AuthorActionsType.NFT, track.id, true)}
        />
      ) : undefined,
  };

  useEffect(() => {
    if (track.nftData?.tokenId) {
      fetchCountBids({ variables: { tokenId: track.nftData.tokenId } });
      fetchListingItem({
        variables: { tokenId: track.nftData.tokenId },
      });
    }
  }, [track, fetchCountBids, fetchListingItem]);

  useEffect(() => {
    if (track.artistProfileId) {
      profile({ variables: { id: track.artistProfileId } });
    }
  }, [track.artistProfileId, profile]);

  useEffect(() => {
    if (nftData?.owner) {
      userByWallet({ variables: { walletAddress: nftData.owner } });
    }
  }, [nftData?.owner, userByWallet]);

  useEffect(() => {
    if (!account || !web3 || tokenId === null || tokenId === undefined) {
      return;
    }
    isTokenOwner(web3, tokenId, account)
      .then(result => setIsOwner(result))
      .finally(() => setLoadingOwner(false));
  }, [account, web3, tokenId, isTokenOwner]);

  useEffect(() => {
    const fetchRoyalties = async () => {
      if (!account || !web3 || tokenId === null || tokenId === undefined || royalties != undefined) {
        return;
      }
      const royaltiesFromBlockchain = await getRoyalties(web3, tokenId);
      setRoyalties(royaltiesFromBlockchain);
    };
    fetchRoyalties();
  }, [account, web3, tokenId, getRoyalties, royalties]);

  useEffect(() => {
    const fetchHighestBid = async () => {
      if (!web3 || !tokenId || !getHighestBid || highestBid.bidder != undefined) {
        return;
      }
      const { _bid, _bidder } = await getHighestBid(web3, tokenId);
      setHighestBid({ bid: _bid, bidder: _bidder });
    };
    fetchHighestBid();
  }, [tokenId, web3, getHighestBid, highestBid.bidder]);

  useEffect(() => {
    if (highestBid.bidder) {
      fetchHighestBidder({
        variables: {
          walletAddress: highestBid.bidder,
        },
      });
    }
  }, [highestBid.bidder, fetchHighestBidder]);

  useEffect(() => {
    if (trackData) {
      setTrack(trackData.track);
    }
  }, [trackData]);

  useEffect(() => {
    if (isAuction && account && listingPayload?.listingItem?.id) {
      fetchHaveBided({ variables: { auctionId: listingPayload.listingItem.id, bidder: account } });
    }
  }, [fetchHaveBided, isAuction, listingPayload?.listingItem?.id, account]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (isProcessing) {
        refetchTrack({ variables: { id: track.id } });
        if (tokenId) {
          fetchListingItem({ variables: { tokenId } });
        }
      }
    }, 10 * 1000);

    return () => clearInterval(interval);
  }, [isProcessing, refetchTrack, fetchListingItem, tokenId, track.id]);

  return (
    <>
      <SEO
        title={`Track - ${track.title}`}
        description={track.artist || 'on Soundchain'}
        canonicalUrl={`/tracks/${track.id}`}
        image={track.artworkUrl}
      />
      <Layout topNavBarProps={topNavBarProps}>
        <div className="p-3 flex flex-col gap-5">
          <Track track={track} />
          {isAuction && !auctionIsOver && isHighestBidder && (
            <div className="text-green-500 font-bold p-2 text-center">You have the highest bid!</div>
          )}
          {isAuction &&
            !auctionIsOver &&
            haveBided?.haveBided.bided &&
            isHighestBidder !== undefined &&
            !isHighestBidder && <div className="text-red-500 font-bold p-2 text-center">You have been outbid!</div>}
          <Description description={track.description || ''} />
        </div>
        {isBuyNow && price && (
          <div className="bg-[#112011]">
            <div className="flex justify-between items-center px-4 py-3">
              <div className="text-sm font-bold text-white">BUY NOW PRICE</div>
              <div className="text-md flex items-center font-bold gap-1">
                <Matic />
                <span className="text-white">{price}</span>
                <span className="text-xxs text-gray-80">MATIC</span>
              </div>
            </div>
            {futureSale && (
              <div className="flex justify-between items-center px-4 py-3">
                <div className="text-sm font-bold text-white flex-shrink-0">SALE STARTS</div>
                <div className="text-md flex items-center text-right font-bold gap-1">
                  <Timer date={startingDate!} reloadOnEnd />
                </div>
              </div>
            )}
          </div>
        )}
        {isAuction && (
          <div className="bg-[#111920]">
            {futureSale && (
              <div className="flex justify-between items-center px-4 py-3">
                <div className="text-sm font-bold text-white flex-shrink-0">SALE STARTS</div>
                <div className="text-md flex items-center text-right font-bold gap-1">
                  <Timer date={startingDate!} reloadOnEnd />
                </div>
              </div>
            )}
            {endingDate && !futureSale && (
              <div className="flex justify-between items-center px-4 py-3">
                <div className="text-sm font-bold text-white flex-shrink-0">TIME REMAINING</div>
                <div className="text-md flex items-center text-right font-bold gap-1">
                  <Timer date={endingDate} endedMessage="Auction Ended" />
                </div>
              </div>
            )}
            <div className="flex justify-between items-center px-4 py-3">
              <div className="text-sm font-bold text-white">{auctionIsOver ? 'FINAL PRICE' : 'CURRENT PRICE'}</div>
              <div className="text-md flex items-center font-bold gap-1">
                <Matic />
                <span className="text-white">{price}</span>
                <span className="text-xxs text-gray-80">MATIC</span>
                <span className="text-[#22CAFF] text-xxs">[{bidCount} bids]</span>
              </div>
            </div>
            {highestBidderData?.getUserByWallet && (
              <div className="text-white flex justify-between items-center px-4 py-3">
                <div className="text-sm font-bold">HIGHEST BIDDER</div>
                <div className="flex items-center gap-2">
                  <Avatar
                    profile={{
                      profilePicture: highestBidderData?.getUserByWallet.profile.profilePicture,
                      userHandle: highestBidderData?.getUserByWallet.profile.userHandle,
                    }}
                    pixels={30}
                    linkToProfile
                  />
                  <div className="flex flex-col ">
                    <div className="text-sm font-bold">{highestBidderData?.getUserByWallet.profile.displayName}</div>
                    <div className="text-xxs text-gray-CC font-bold">
                      @{highestBidderData?.getUserByWallet.profile.userHandle}
                    </div>
                  </div>
                </div>
              </div>
            )}
            {isOwner && bidCount === 0 && auctionIsOver && (
              <div className="text-white flex justify-between items-center px-4 py-3">
                <div className="text-sm font-bold">RESULT</div>
                <div className="text-md flex items-center font-bold gap-1">Auction ended with no bids</div>
              </div>
            )}
          </div>
        )}
        <TrackInfo
          trackTitle={track.title}
          albumTitle={track.album}
          releaseYear={track.releaseYear}
          genres={track.genres}
          copyright={track.copyright}
          mintingPending={mintingPending}
          artistProfile={profileInfo?.profile}
          royalties={royalties}
        />
        {nftData && (
          <MintingData
            transactionHash={nftData.transactionHash}
            ipfsCid={nftData.ipfsCid}
            ownerProfile={ownerProfile?.getUserByWallet?.profile as Partial<Profile>}
          />
        )}
        {isProcessing && !mintingPending && nftData?.pendingRequest ? (
          <div className=" flex justify-center items-center p-3">
            <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-white" />
            <div className="text-white text-sm pl-3 font-bold">
              Processing {pendingRequestMapping[nftData.pendingRequest]}
            </div>
          </div>
        ) : loading ? (
          <div className=" flex justify-center items-center">
            <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-white" />
            <div className="text-white text-sm pl-3 font-bold">Loading</div>
          </div>
        ) : me ? (
          <HandleNFT
            canList={canList}
            price={price}
            isOwner={isOwner}
            isBuyNow={isBuyNow}
            isAuction={isAuction}
            canComplete={canComplete}
            auctionIsOver={auctionIsOver}
            countBids={bidCount}
            startingDate={startingDate}
            endingDate={endingDate}
          />
        ) : null}
      </Layout>
    </>
  );
}

export const Timer = ({
  date,
  endedMessage,
  reloadOnEnd,
}: {
  date: Date;
  endedMessage?: string;
  reloadOnEnd?: boolean;
}) => {
  const router = useRouter();

  if (endedMessage && new Date().getTime() > date.getTime()) {
    return <div className="text-[#FF4D4D]">{endedMessage}</div>;
  }
  return (
    <TimeCounter
      date={date}
      onEndTimer={() => {
        if (reloadOnEnd) {
          router.reload();
        }
      }}
    >
      {(days, hours, minutes, seconds) => (
        <div className="text-white">
          {days !== 0 && (
            <>
              {days} <span className="text-gray-80">days </span>
            </>
          )}
          {hours !== 0 && (
            <>
              {hours} <span className="text-gray-80">hours </span>
            </>
          )}
          {minutes !== 0 && (
            <>
              {minutes} <span className="text-gray-80">minutes </span>
            </>
          )}
          {seconds !== 0 && (
            <>
              {seconds} <span className="text-gray-80">seconds </span>
            </>
          )}
        </div>
      )}
    </TimeCounter>
  );
};
