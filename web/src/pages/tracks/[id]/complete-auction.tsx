import { Button } from 'components/Button';
import { BackButton } from 'components/Buttons/BackButton';
import { AuctionEnded } from 'components/details-NFT/AuctionEnded';
import { Layout } from 'components/Layout';
import MaxGasFee from 'components/MaxGasFee';
import { TopNavBarProps } from 'components/TopNavBar';
import { Track } from 'components/Track';
import useBlockchain from 'hooks/useBlockchain';
import { useMe } from 'hooks/useMe';
import { useWalletContext } from 'hooks/useWalletContext';
import { cacheFor } from 'lib/apollo';
import {
  PendingRequest,
  TrackDocument,
  TrackQuery,
  useAuctionItemLazyQuery,
  useUpdateTrackMutation,
} from 'lib/graphql';
import { protectPage } from 'lib/protectPage';
import { useRouter } from 'next/router';
import { ParsedUrlQuery } from 'querystring';
import { useEffect, useState } from 'react';

export interface TrackPageProps {
  track: TrackQuery['track'];
}

export interface HighestBid {
  bid: string;
  bidder: string;
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

  return cacheFor(CompleteAuctionPage, { track: data.track }, context, apolloClient);
});

export default function CompleteAuctionPage({ track }: TrackPageProps) {
  const { resultAuction, getHighestBid } = useBlockchain();
  const { account, web3 } = useWalletContext();
  const [trackUpdate] = useUpdateTrackMutation();
  const [loading, setLoading] = useState(false);
  const [highestBid, setHighestBid] = useState<HighestBid>({} as HighestBid);
  const me = useMe();
  const router = useRouter();

  const tokenId = track.nftData?.tokenId ?? -1;

  const [getAuctionItem, { data: auctionItem }] = useAuctionItemLazyQuery({
    variables: { tokenId },
  });

  useEffect(() => {
    getAuctionItem();
  }, [getAuctionItem]);

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

  if (!auctionItem) {
    return null;
  }

  const saleEnded = (auctionItem.auctionItem?.auctionItem?.endingTime || 0) < Math.floor(Date.now() / 1000);

  const handleClaim = () => {
    if (!web3 || !auctionItem.auctionItem?.auctionItem?.tokenId || !account) {
      return;
    }
    const onTransactionHash = async () => {
      await trackUpdate({
        variables: {
          input: {
            trackId: track.id,
            nftData: {
              pendingRequest: PendingRequest.CompleteAuction,
            },
          },
        },
      });
      router.push(router.asPath.replace('complete-auction', ''));
    };
    resultAuction(web3, tokenId, account, onTransactionHash);
    setLoading(true);
  };

  const topNovaBarProps: TopNavBarProps = {
    leftButton: <BackButton />,
    title: 'Complete Auction',
  };

  if (account !== highestBid.bidder || !saleEnded || !me || track.nftData?.pendingRequest != PendingRequest.None) {
    return null;
  }

  return (
    <Layout topNavBarProps={topNovaBarProps}>
      <div className="m-4">
        <Track track={track} />
      </div>
      <AuctionEnded highestBid={highestBid} />
      <div className="flex p-4">
        <MaxGasFee />
        <Button variant="buy-nft" onClick={handleClaim} loading={loading}>
          <div className="px-4">CLAIM NFT</div>
        </Button>
      </div>
    </Layout>
  );
}
