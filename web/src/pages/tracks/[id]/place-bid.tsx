import { Button } from 'components/Button';
import { BackButton } from 'components/Buttons/BackButton';
import { PlaceBid } from 'components/details-NFT/PlaceBid';
import { Layout } from 'components/Layout';
import { TopNavBarProps } from 'components/TopNavBar';
import { Track } from 'components/Track';
import useBlockchain from 'hooks/useBlockchain';
import { useMe } from 'hooks/useMe';
import { useWalletContext } from 'hooks/useWalletContext';
import { Matic } from 'icons/Matic';
import { cacheFor } from 'lib/apollo';
import {
  PendingRequest,
  TrackDocument,
  TrackQuery,
  useAuctionItemQuery,
  useCountBidsQuery,
  useHaveBidedLazyQuery,
  useMaticUsdQuery,
} from 'lib/graphql';
import { protectPage } from 'lib/protectPage';
import { ParsedUrlQuery } from 'querystring';
import { useEffect, useState } from 'react';
import { currency } from 'utils/format';

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

  return cacheFor(PlaceBidPage, { track: data.track }, context, apolloClient);
});

export default function PlaceBidPage({ track }: TrackPageProps) {
  const { placeBid, getHighestBid } = useBlockchain();
  const { account, web3 } = useWalletContext();
  const { data: maticQuery } = useMaticUsdQuery();
  const [loading, setLoading] = useState(false);
  const [bidAmount, setBidAmount] = useState(0);
  const [highestBid, setHighestBid] = useState('0');
  const [isHighestBidder, setIsHighestBidder] = useState(false);
  const me = useMe();

  const tokenId = track.nftData?.tokenId ?? -1;

  const { data: auctionItem } = useAuctionItemQuery({
    variables: { tokenId },
  });

  const [fetchHaveBided, { data: haveBided, refetch: refetchHaveBided }] = useHaveBidedLazyQuery({
    fetchPolicy: 'network-only',
  });

  useEffect(() => {
    if (account && auctionItem?.auctionItem.auctionItem?.id) {
      fetchHaveBided({ variables: { auctionId: auctionItem.auctionItem.auctionItem.id, bidder: account } });
    }
  }, [fetchHaveBided, auctionItem?.auctionItem.auctionItem?.id, account]);

  const { data: countBids, refetch: refetchCountBids } = useCountBidsQuery({ variables: { tokenId } });

  useEffect(() => {
    if (!web3) {
      return;
    }
    const fetchHighestBid = async () => {
      const { _bid, _bidder } = await getHighestBid(web3, tokenId);
      setIsHighestBidder(_bidder.toLowerCase() === account?.toLowerCase());
      setHighestBid(_bid);
      refetchCountBids();
    };
    fetchHighestBid();
    const interval = setInterval(() => {
      fetchHighestBid();
    }, 10 * 1000);

    return () => clearInterval(interval);
  }, [tokenId, track.id, web3, getHighestBid, account, refetchCountBids]);

  if (!auctionItem) {
    return null;
  }

  const isOwner = auctionItem.auctionItem?.auctionItem?.owner.toLowerCase() === account?.toLowerCase();
  const isForSale = !!auctionItem.auctionItem.auctionItem?.reservePrice ?? false;
  const reservePrice = web3?.utils.fromWei(auctionItem.auctionItem.auctionItem?.reservePrice ?? '0', 'ether');
  const hasStarted = (auctionItem.auctionItem?.auctionItem?.startingTime ?? 0) <= new Date().getTime() / 1000;

  const handlePlaceBid = () => {
    if (
      !web3 ||
      !auctionItem.auctionItem?.auctionItem?.tokenId ||
      !auctionItem.auctionItem?.auctionItem?.owner ||
      !account
    ) {
      return;
    }
    const amount = (bidAmount * 1e18).toString();
    placeBid(web3, tokenId, account, amount, () => {
      setLoading(false);
      if (refetchHaveBided) refetchHaveBided();
      refetchCountBids();
    });
    setLoading(true);
  };

  const topNovaBarProps: TopNavBarProps = {
    leftButton: <BackButton />,
    title: 'Place Bid',
  };

  if (!isForSale || isOwner || !me || track.nftData?.pendingRequest != PendingRequest.None) {
    return null;
  }

  return (
    <Layout topNavBarProps={topNovaBarProps}>
      <div className="m-4">
        <Track track={track} />
      </div>
      {reservePrice && account && (
        <PlaceBid
          highestBid={highestBid}
          reservePrice={reservePrice}
          bidAmount={bidAmount}
          onSetBidAmount={amount => setBidAmount(amount)}
          ownerAddressAccount={account}
          startTime={auctionItem.auctionItem?.auctionItem?.startingTime ?? 0}
          endingTime={auctionItem.auctionItem?.auctionItem?.endingTime ?? 0}
          countBids={countBids?.countBids.numberOfBids ?? 0}
        />
      )}
      {isHighestBidder && <div className="text-green-500 font-bold p-4 text-center">You have the highest bid!</div>}
      {haveBided?.haveBided.bided && !isHighestBidder && (
        <div className="text-red-500 font-bold p-4 text-center">You have been outbid!</div>
      )}
      {bidAmount >= 0 && hasStarted && (
        <div className="flex p-4">
          <div className="flex-1 font-black text-xs">
            <div className="flex items-center gap-2 text-white">
              <Matic />
              <div className="text-white">{bidAmount}</div>MATIC
            </div>
            {maticQuery?.maticUsd && (
              <span className="text-xs text-gray-50 font-bold">
                {`${currency(bidAmount * parseFloat(maticQuery?.maticUsd))} USD`}
              </span>
            )}
          </div>
          <Button
            variant="buy-nft"
            onClick={handlePlaceBid}
            loading={loading}
            disabled={bidAmount <= parseFloat(reservePrice || '0') || bidAmount <= parseFloat(highestBid) * 1.015}
          >
            <div className="px-4">CONFIRM BID</div>
          </Button>
        </div>
      )}
    </Layout>
  );
}
