import { BackButton } from 'components/Buttons/BackButton';
import { Description } from 'components/details-NFT/Description';
import { HandleNFT } from 'components/details-NFT/HandleNFT';
import { MintingData } from 'components/details-NFT/MintingData';
import { TrackInfo } from 'components/details-NFT/TrackInfo';
import { ViewPost } from 'components/details-NFT/ViewPost';
import { Matic } from 'components/Matic';
import { ProfileWithAvatar } from 'components/ProfileWithAvatar';
import SEO from 'components/SEO';
import { TimeCounter } from 'components/TimeCounter';
import { TopNavBarProps } from 'components/TopNavBar';
import { Track } from 'components/Track';
import { TrackShareButton } from 'components/TrackShareButton';
import { useModalDispatch } from 'contexts/providers/modal';
import useBlockchain from 'hooks/useBlockchain';
import { useLayoutContext } from 'hooks/useLayoutContext';
import { useMe } from 'hooks/useMe';
import { useTokenOwner } from 'hooks/useTokenOwner';
import { useWalletContext } from 'hooks/useWalletContext';
import { Ellipsis } from 'icons/Ellipsis';
import {
  PendingRequest,
  Profile,
  Role,
  TrackQuery,
  useCountBidsLazyQuery,
  useHaveBidedLazyQuery,
  useListingItemLazyQuery,
  useProfileLazyQuery,
  useTrackLazyQuery,
  useUserByWalletLazyQuery,
} from 'lib/graphql';
import { useRouter } from 'next/router';
import { HighestBid } from 'pages/tracks/[id]/complete-auction';
import { useEffect, useMemo, useState } from 'react';
import { AuthorActionsType } from 'types/AuthorActionsType';
import { priceToShow } from 'utils/format';
import { compareWallets } from 'utils/Wallet';
import { UtilityInfo } from '../details-NFT/UtilityInfo';

interface SingleTrackPageProps {
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

export const SingleTrackPage = ({ track }: SingleTrackPageProps) => {
  const me = useMe();
  const { account, web3 } = useWalletContext();
  const { getRoyalties, getHighestBid } = useBlockchain();
  const [royalties, setRoyalties] = useState<number>();
  const [highestBid, setHighestBid] = useState<HighestBid>({} as HighestBid);
  const { dispatchShowAuthorActionsModal, dispatchShowBidsHistory } = useModalDispatch();
  const { loading: isLoadingOwner, isOwner } = useTokenOwner(track.nftData?.tokenId, track.nftData?.contract);

  const [refetchTrack, { data: trackData }] = useTrackLazyQuery({
    fetchPolicy: 'network-only',
    nextFetchPolicy: 'network-only',
  });
  const [fetchCountBids, { data: countBids }] = useCountBidsLazyQuery({
    fetchPolicy: 'network-only',
    nextFetchPolicy: 'network-only',
  });
  const [fetchHaveBided, { data: haveBided }] = useHaveBidedLazyQuery({
    fetchPolicy: 'network-only',
    nextFetchPolicy: 'network-only',
  });
  const [fetchListingItem, { data: listingPayload, loading: loadingListingItem }] = useListingItemLazyQuery({
    fetchPolicy: 'network-only',
    nextFetchPolicy: 'network-only',
  });
  const [fetchHighestBidder, { data: highestBidderData }] = useUserByWalletLazyQuery({
    fetchPolicy: 'network-only',
    nextFetchPolicy: 'network-only',
  });
  const [profile, { data: profileInfo }] = useProfileLazyQuery();
  const [userByWallet, { data: ownerProfile }] = useUserByWalletLazyQuery();
  const { setTopNavBarProps } = useLayoutContext();

  const nftData = trackData?.track.nftData || track.nftData;
  const mintingPending = nftData?.pendingRequest === PendingRequest.Mint;
  const isProcessing = nftData?.pendingRequest != PendingRequest.None;
  const tokenId = nftData?.tokenId;
  const contractAddress = nftData?.contract;
  const canList = (me?.profile.verified && nftData?.minter === account) || nftData?.minter != account;
  const isBuyNow = Boolean(listingPayload?.listingItem?.pricePerItem);
  const isAuction = Boolean(listingPayload?.listingItem?.reservePrice);
  const bidCount = countBids?.countBids.numberOfBids ?? 0;

  const { reservePriceToShow, pricePerItemToShow, id } = listingPayload?.listingItem ?? {};

  let price = pricePerItemToShow || 0;
  if (isAuction || bidCount) {
    price = highestBid.bid || reservePriceToShow || 0;
  }
  const auctionIsOver = (listingPayload?.listingItem?.endingTime || 0) < Math.floor(Date.now() / 1000);
  const canComplete =
    auctionIsOver &&
    (compareWallets(highestBid.bidder, account) || compareWallets(account, listingPayload?.listingItem?.owner));
  const isHighestBidder = highestBid.bidder ? compareWallets(highestBid.bidder, account) : undefined;
  const startingDate = listingPayload?.listingItem?.startingTime
    ? new Date(listingPayload.listingItem.startingTime * 1000)
    : undefined;
  const endingDate = listingPayload?.listingItem?.endingTime
    ? new Date(listingPayload.listingItem.endingTime * 1000)
    : undefined;
  const futureSale = startingDate ? startingDate.getTime() > new Date().getTime() : false;
  const loading = loadingListingItem || isLoadingOwner;

  const topNavBarProps: TopNavBarProps = useMemo(
    () => ({
      leftButton: <BackButton />,
      title: 'NFT Details',
      rightButton: (
        <div className="flex items-center gap-3">
          <TrackShareButton trackId={track.id} artist={track.artist} title={track.title} />
          {(isOwner || me?.roles.includes(Role.Admin)) && (
            <button
              type="button"
              aria-label="More options"
              className="flex h-10 w-10 items-center justify-center"
              onClick={() => dispatchShowAuthorActionsModal(true, AuthorActionsType.NFT, track.id, true)}
            >
              <Ellipsis fill="#808080" />
            </button>
          )}
        </div>
      ),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isOwner, me?.roles, track.artist, track.id, track.title],
  );

  useEffect(() => {
    setTopNavBarProps(topNavBarProps);
  }, [setTopNavBarProps, topNavBarProps]);

  useEffect(() => {
    if (tokenId && contractAddress) {
      fetchCountBids({ variables: { tokenId } });
      fetchListingItem({
        variables: { input: { tokenId, contractAddress } },
      });
    }
  }, [track, fetchCountBids, fetchListingItem, tokenId, contractAddress]);

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
    const fetchRoyalties = async () => {
      if (!account || !web3 || tokenId === null || tokenId === undefined || royalties != undefined) {
        return;
      }
      const royaltiesFromBlockchain = await getRoyalties(web3, tokenId, { nft: nftData?.contract });
      setRoyalties(royaltiesFromBlockchain);
    };
    fetchRoyalties();
  }, [account, web3, tokenId, getRoyalties, royalties, nftData]);

  useEffect(() => {
    const fetchHighestBid = async () => {
      if (!web3 || !tokenId || !getHighestBid || highestBid.bidder != undefined) {
        return;
      }
      const { _bid, _bidder } = await getHighestBid(web3, tokenId, { nft: nftData?.contract });
      setHighestBid({ bid: priceToShow(_bid || '0'), bidder: _bidder });
    };
    fetchHighestBid();
  }, [tokenId, web3, getHighestBid, highestBid.bidder, nftData]);

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
    if (isAuction && account && listingPayload?.listingItem?.id) {
      fetchHaveBided({ variables: { auctionId: listingPayload.listingItem.id, bidder: account } });
    }
  }, [fetchHaveBided, isAuction, listingPayload?.listingItem?.id, account]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (isProcessing) {
        refetchTrack({ variables: { id: track.id } });
        if (tokenId && contractAddress) {
          fetchListingItem({ variables: { input: { tokenId, contractAddress } } });
        }
      }
    }, 10 * 1000);

    return () => clearInterval(interval);
  }, [isProcessing, refetchTrack, fetchListingItem, tokenId, track.id, contractAddress]);

  const title = `${track.title} - song by ${track.artist} | SoundChain`;
  const description = `Listen to ${track.title} on SoundChain. ${track.artist}. ${track.album || 'Song'}. ${
    track.releaseYear != null ? `${track.releaseYear}.` : ''
  }`;

  return (
    <>
      <SEO title={title} description={description} canonicalUrl={`/tracks/${track.id}`} image={track.artworkUrl} />
      <div className="flex flex-col gap-5 p-3">
        <Track track={track} />
        <ViewPost trackId={track.id} isFavorited={track.isFavorite} />
        {isAuction && !auctionIsOver && isHighestBidder && (
          <div className="p-2 text-center font-bold text-green-500">You have the highest bid!</div>
        )}
        {isAuction &&
          !auctionIsOver &&
          haveBided?.haveBided.bided &&
          isHighestBidder !== undefined &&
          !isHighestBidder && <div className="p-2 text-center font-bold text-red-500">You have been outbid!</div>}
      </div>
      {isBuyNow && price && (
        <div className="bg-[#112011]">
          <div className="flex items-center justify-between gap-3 px-4 py-3">
            <div className="text-xs font-bold text-gray-80">BUY NOW PRICE</div>
            <Matic value={price} variant="currency-inline" className="text-xs" />
          </div>
          {futureSale && (
            <div className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="flex-shrink-0 text-xs font-bold text-gray-80">SALE STARTS</div>
              <div className="flex items-center gap-1 text-right text-xs font-bold">
                <Timer date={startingDate!} reloadOnEnd />
              </div>
            </div>
          )}
        </div>
      )}
      {isAuction && (
        <div className="bg-[#111920]">
          {futureSale && (
            <div className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="flex-shrink-0 text-xs font-bold text-gray-80">SALE STARTS</div>
              <div className="flex items-center gap-1 text-right text-xs font-bold">
                <Timer date={startingDate!} reloadOnEnd />
              </div>
            </div>
          )}
          {endingDate && !futureSale && (
            <div className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="flex-shrink-0 text-xs font-bold text-gray-80">TIME REMAINING</div>
              <div className="flex items-center gap-1 text-right text-xs font-bold">
                <Timer date={endingDate} endedMessage="Auction Ended" />
              </div>
            </div>
          )}
          <div className="flex items-center justify-between gap-3 px-4 py-3">
            <div className="text-xs font-bold text-gray-80 ">{auctionIsOver ? 'FINAL PRICE' : 'CURRENT PRICE'}</div>
            <div className="flex items-center gap-1 font-bold">
              <Matic value={price} variant="currency-inline" className="text-xs" />
              <button className="text-xxs text-[#22CAFF]" onClick={() => dispatchShowBidsHistory(true, id || '')}>
                [{bidCount} bids]
              </button>
            </div>
          </div>
          {highestBidderData?.getUserByWallet && (
            <div className="flex items-center justify-between gap-3 px-4 py-3 text-gray-80">
              <div className="text-xs font-bold">HIGHEST BIDDER</div>
              <ProfileWithAvatar profile={highestBidderData.getUserByWallet.profile} />
            </div>
          )}
          {isOwner && bidCount === 0 && auctionIsOver && (
            <div className="flex items-center justify-between gap-3 px-4 py-3 text-white">
              <div className="text-xs font-bold">RESULT</div>
              <div className="flex items-center gap-1 text-xs font-bold">Auction ended with no bids</div>
            </div>
          )}
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
        mintingPending={mintingPending}
        artistProfile={profileInfo?.profile}
        royalties={royalties}
        me={me}
      />
      {nftData && (
        <MintingData
          transactionHash={nftData.transactionHash}
          ipfsCid={nftData.ipfsCid}
          ownerProfile={ownerProfile?.getUserByWallet?.profile as Partial<Profile>}
        />
      )}
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
            isAuction={isAuction}
            canComplete={canComplete}
            auctionIsOver={auctionIsOver}
            countBids={bidCount}
            startingDate={startingDate}
            endingDate={endingDate}
            auctionId={id || ''}
          />
        ))}
    </>
  );
};

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
