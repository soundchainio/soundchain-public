import { BackButton } from 'components/Buttons/BackButton';
import { Description } from 'components/details-NFT/Description';
import { HandleNFT } from 'components/details-NFT/HandleNFT';
import { MintingData } from 'components/details-NFT/MintingData';
import { TrackInfo } from 'components/details-NFT/TrackInfo';
import { Layout } from 'components/Layout';
import { TopNavBarProps } from 'components/TopNavBar';
import { Track } from 'components/Track';
import useBlockchain from 'hooks/useBlockchain';
import { useMe } from 'hooks/useMe';
import { useWalletContext } from 'hooks/useWalletContext';
import { cacheFor } from 'lib/apollo';
import {
  PendingRequest,
  Profile,
  TrackDocument,
  TrackQuery,
  useCountBidsQuery,
  useListingItemQuery,
  useProfileLazyQuery,
  useTrackLazyQuery,
  useUserByWalletLazyQuery,
} from 'lib/graphql';
import { protectPage } from 'lib/protectPage';
import { ParsedUrlQuery } from 'querystring';
import { useEffect, useState } from 'react';
import { HighestBid } from './[id]/complete-auction';

export interface TrackPageProps {
  track: TrackQuery['track'];
}

interface TrackPageParams extends ParsedUrlQuery {
  id: string;
}

export const getServerSideProps = protectPage<TrackPageProps, TrackPageParams>(async (context, apolloClient) => {
  const trackId = context.params?.id;

  if (!trackId) {
    return { notFound: true };
  }

  const { data, error } = await apolloClient.query({
    query: TrackDocument,
    variables: { id: trackId },
    context,
  });

  if (error) {
    return { notFound: true };
  }

  return cacheFor(TrackPage, { track: data.track }, context, apolloClient);
});

const pendingRequestMapping: Record<PendingRequest, string> = {
  CancelListing: 'cancel listing',
  Buy: 'buy',
  List: 'list',
  Mint: 'mint',
  None: 'none',
  UpdateListing: 'update listing',
  PlaceBid: 'place bid',
  CompleteAuction: 'complete auction',
};

export default function TrackPage({ track: initialState }: TrackPageProps) {
  const me = useMe();
  const { account, web3 } = useWalletContext();
  const { isTokenOwner, getRoyalties, getHighestBid } = useBlockchain();
  const [isOwner, setIsOwner] = useState<boolean>();
  const [royalties, setRoyalties] = useState(0);
  const [refetchTrack, { data: trackData }] = useTrackLazyQuery({ fetchPolicy: 'network-only' });
  const [track, setTrack] = useState<TrackQuery['track']>(initialState);
  const [highestBid, setHighestBid] = useState<HighestBid>({} as HighestBid);

  const nftData = track.nftData;
  const mintingPending = nftData?.pendingRequest === PendingRequest.Mint;
  const isProcessing = nftData?.pendingRequest != PendingRequest.None;
  const tokenId = nftData?.tokenId ?? -1;
  const canList = (me?.profile.verified && nftData?.minter === account) || nftData?.minter != account;

  const { data: countBids } = useCountBidsQuery({ variables: { tokenId } });

  const {
    data: listingPayload,
    loading,
    refetch: refetchListing,
  } = useListingItemQuery({
    variables: { tokenId },
    fetchPolicy: 'network-only',
  });

  const [profile, { data: profileInfo }] = useProfileLazyQuery({
    variables: { id: track.artistProfileId ?? '' },
    ssr: false,
  });

  const [userByWallet, { data: ownerProfile }] = useUserByWalletLazyQuery({
    variables: { walletAddress: track.nftData?.owner ?? '' },
    ssr: false,
  });

  useEffect(() => {
    if (track.artistProfileId) {
      profile();
    }
  }, [track.artistProfileId, profile]);

  useEffect(() => {
    if (nftData?.owner) {
      userByWallet();
    }
  }, [nftData?.owner, userByWallet]);

  useEffect(() => {
    const fetchIsOwner = async () => {
      if (!account || !web3 || nftData?.tokenId === null || nftData?.tokenId === undefined) {
        return;
      }
      const isTokenOwnerRes = await isTokenOwner(web3, nftData.tokenId, account);
      setIsOwner(isTokenOwnerRes);
    };
    fetchIsOwner();
  }, [account, web3, nftData, isTokenOwner]);

  useEffect(() => {
    const fetchRoyalties = async () => {
      if (!account || !web3 || nftData?.tokenId === null || nftData?.tokenId === undefined) {
        return;
      }
      const royalties = await getRoyalties(web3, nftData.tokenId);
      setRoyalties(royalties);
    };
    fetchRoyalties();
  }, [account, web3, nftData, getRoyalties]);

  useEffect(() => {
    const fetchHighestBid = async () => {
      if (!web3 || !tokenId || !getHighestBid || highestBid.bidder) {
        return;
      }
      const { _bid, _bidder } = await getHighestBid(web3, tokenId);
      setHighestBid({ bid: _bid, bidder: _bidder });
    };
    fetchHighestBid();
  }, [tokenId, web3, getHighestBid, highestBid.bidder]);

  useEffect(() => {
    if (trackData) {
      setTrack(trackData.track);
    }
  }, [trackData]);

  const isAuction = !!listingPayload?.listingItem.reservePrice ?? false;
  const isBuyNow = !!listingPayload?.listingItem.pricePerItem ?? false;
  let price;
  if (isAuction && highestBid.bid === '0') {
    price = web3?.utils.fromWei(listingPayload?.listingItem.reservePrice ?? '0', 'ether');
  } else if (isAuction) {
    price = web3?.utils.fromWei(highestBid.bid ?? '0', 'ether');
  } else {
    price = web3?.utils.fromWei(listingPayload?.listingItem.pricePerItem?.toString() ?? '0', 'ether');
  }

  const auctionIsOver = (listingPayload?.listingItem.endingTime || 0) < Math.floor(Date.now() / 1000);
  const canComplete = auctionIsOver && highestBid.bidder?.toLowerCase() === account?.toLowerCase();

  const topNovaBarProps: TopNavBarProps = {
    leftButton: <BackButton />,
    title: 'NFT Details',
  };

  useEffect(() => {
    const interval = setInterval(() => {
      if (isProcessing) {
        refetchTrack({ variables: { id: track.id } });
      }
      if (tokenId !== -1) {
        refetchListing({ tokenId: tokenId });
      }
    }, 10 * 1000);

    return () => clearInterval(interval);
  }, [isProcessing, refetchTrack, refetchListing, tokenId, track.id]);

  return (
    <Layout topNavBarProps={topNovaBarProps}>
      <div className="p-3 flex flex-col gap-5">
        <Track track={track} />
        <Description description={track.description || ''} />
      </div>
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
      ) : isOwner == undefined || loading ? (
        <div className=" flex justify-center items-center">
          <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-white" />
          <div className="text-white text-sm pl-3 font-bold">Loading</div>
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
          countBids={countBids?.countBids.numberOfBids ?? 0}
        />
      )}
    </Layout>
  );
}
