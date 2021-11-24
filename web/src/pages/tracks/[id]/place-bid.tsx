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
import { PendingRequest, TrackDocument, TrackQuery, useAuctionItemLazyQuery, useMaticUsdQuery } from 'lib/graphql';
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
  const me = useMe();

  const tokenId = track.nftData?.tokenId ?? -1;

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
  }, [tokenId, track.id, web3, getHighestBid]);

  if (!auctionItem) {
    return null;
  }

  const ownerAddressAccount = auctionItem.auctionItem?.auctionItem?.owner.toLowerCase();
  const isOwner = ownerAddressAccount === account?.toLowerCase();
  const isForSale = !!auctionItem.auctionItem.auctionItem?.reservePrice ?? false;
  const reservePrice = web3?.utils.fromWei(auctionItem.auctionItem.auctionItem?.reservePrice ?? '0', 'ether');

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

  if (!isForSale || isOwner || !me || track.nftData?.pendingRequest != PendingRequest.None) {
    return null;
  }

  return (
    <Layout topNavBarProps={topNovaBarProps}>
      <div className="m-4">
        <Track track={track} />
      </div>
      {reservePrice && ownerAddressAccount && (
        <PlaceBid
          highestBid={highestBid}
          reservePrice={reservePrice}
          bidAmount={bidAmount}
          onSetBidAmount={amount => setBidAmount(amount)}
          ownerAddressAccount={ownerAddressAccount}
          endingTime={auctionItem.auctionItem?.auctionItem?.endingTime ?? 0}
        />
      )}
      {bidAmount >= 0 && (
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
          <Button variant="buy-nft" onClick={handlePlaceBid} loading={loading}>
            <div className="px-4">CONFIRM BID</div>
          </Button>
        </div>
      )}
    </Layout>
  );
}
