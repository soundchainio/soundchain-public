import { Button } from 'components/Button';
import { BackButton } from 'components/Buttons/BackButton';
import { PlaceBid } from 'components/details-NFT/PlaceBid';
import { Layout } from 'components/Layout';
import { TopNavBarProps } from 'components/TopNavBar';
import { Track } from 'components/Track';
import useBlockchain from 'hooks/useBlockchain';
import { useMaxGasFee } from 'hooks/useMaxGasFee';
import { useMe } from 'hooks/useMe';
import { useWalletContext } from 'hooks/useWalletContext';
import { Matic } from 'icons/Matic';
import { cacheFor } from 'lib/apollo';
import { PendingRequest, TrackDocument, useAuctionItemLazyQuery, useTrackQuery } from 'lib/graphql';
import { protectPage } from 'lib/protectPage';
import { ParsedUrlQuery } from 'querystring';
import { useEffect, useState } from 'react';

export interface TrackPageProps {
  trackId: string;
}

interface TrackPageParams extends ParsedUrlQuery {
  id: string;
}

export const getServerSideProps = protectPage<TrackPageProps, TrackPageParams>(async (context, apolloClient) => {
  const trackId = context.params?.id;

  if (!trackId) {
    return { notFound: true };
  }

  const { error } = await apolloClient.query({
    query: TrackDocument,
    variables: { id: trackId },
    context,
  });

  if (error) {
    return { notFound: true };
  }

  return cacheFor(PlaceBidPage, { trackId }, context, apolloClient);
});

export default function PlaceBidPage({ trackId }: TrackPageProps) {
  const { placeBid, getHighestBid } = useBlockchain();
  const { data: track } = useTrackQuery({ variables: { id: trackId } });
  const { account, web3 } = useWalletContext();
  const maxGasFee = useMaxGasFee();
  const [loading, setLoading] = useState(false);
  const [bidAmount, setBidAmount] = useState(0);
  const [highestBid, setHighestBid] = useState('0');
  const me = useMe();

  const tokenId = track?.track.nftData?.tokenId ?? -1;

  const [getAuctionItem, { data: auctionItem }] = useAuctionItemLazyQuery({
    variables: { tokenId },
  });

  useEffect(() => {
    getAuctionItem();
  }, [getAuctionItem]);

  useEffect(() => {
    if (!web3) {
      return;
    }
    const fetchHighestBid = async () => {
      const { _bid } = await getHighestBid(web3, tokenId);
      setHighestBid(_bid);
    };
    fetchHighestBid();
    const interval = setInterval(() => {
      fetchHighestBid();
    }, 10 * 1000);

    return () => clearInterval(interval);
  }, [tokenId, trackId, web3]);

  if (!auctionItem) {
    return null;
  }

  const ownerAddressAccount = 'listingPayload.buyNowItem?.buyNowItem?.owner.toLowerCase()';
  const isOwner = ownerAddressAccount === account?.toLowerCase();
  const isForSale = !!auctionItem.auctionItem.auctionItem?.reservePrice ?? false;
  const price = '1';

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
    placeBid(web3, tokenId, account, amount, () => setLoading(false));
    setLoading(true);
  };

  const topNovaBarProps: TopNavBarProps = {
    leftButton: <BackButton />,
    title: 'Place Bid',
  };

  if (!isForSale || isOwner || !me || track?.track.nftData?.pendingRequest != PendingRequest.None) {
    return null;
  }

  return (
    <Layout topNavBarProps={topNovaBarProps}>
      <div className="m-4">
        <Track trackId={trackId} />
      </div>
      {price && ownerAddressAccount && (
        <PlaceBid
          highestBid={highestBid}
          bidAmount={bidAmount}
          onSetBidAmount={amount => setBidAmount(amount)}
          ownerAddressAccount={ownerAddressAccount}
          endingTime={auctionItem.auctionItem?.auctionItem?.endingTime ?? 0}
        />
      )}
      <div className="flex p-4">
        <div className="flex-1 font-black text-xs text-gray-80">
          <p>Max gas fee</p>
          <div className="flex items-center gap-1">
            <Matic />
            <div className="text-white">{maxGasFee}</div>MATIC
          </div>
        </div>
        <Button variant="buy-nft" onClick={handlePlaceBid} loading={loading}>
          <div className="px-4">CONFIRM BID</div>
        </Button>
      </div>
    </Layout>
  );
}
