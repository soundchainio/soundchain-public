import { Button } from 'components/Button';
import { BackButton } from 'components/Buttons/BackButton';
import { Layout } from 'components/Layout';
import MaxGasFee from 'components/MaxGasFee';
import PlayerAwareBottomBar from 'components/PlayerAwareBottomBar';
import { TopNavBarProps } from 'components/TopNavBar';
import { Track } from 'components/Track';
import useBlockchainV2 from 'hooks/useBlockchainV2';
import { useMe } from 'hooks/useMe';
import { useWalletContext } from 'hooks/useWalletContext';
import { cacheFor } from 'lib/apollo';
import {
  AuctionItemDocument,
  AuctionItemQuery,
  PendingRequest,
  TrackDocument,
  TrackQuery,
  useUpdateTrackMutation,
} from 'lib/graphql';
import { protectPage } from 'lib/protectPage';
import { useRouter } from 'next/router';
import { ParsedUrlQuery } from 'querystring';
import { useState } from 'react';
import { toast } from 'react-toastify';
import SEO from '../../../components/SEO';

export interface TrackPageProps {
  track: TrackQuery['track'];
  auctionItem: AuctionItemQuery['auctionItem']['auctionItem'];
}

interface TrackPageParams extends ParsedUrlQuery {
  id: string;
}

export const getServerSideProps = protectPage<TrackPageProps, TrackPageParams>(async (context, apolloClient) => {
  const trackId = context.params?.id;

  if (!trackId) {
    return { notFound: true };
  }

  const { data, error } = await apolloClient.query<TrackQuery>({
    query: TrackDocument,
    variables: { id: trackId },
    context,
  });

  const tokenId = data.track.nftData?.tokenId;

  if (error || !tokenId) {
    return { notFound: true };
  }

  const { data: auction, error: auctionError } = await apolloClient.query<AuctionItemQuery>({
    query: AuctionItemDocument,
    variables: { tokenId },
    context,
  });

  if (auctionError || !auction.auctionItem) {
    return { notFound: true };
  }

  return cacheFor(
    CompleteAuctionPage,
    { track: data.track, auctionItem: auction.auctionItem.auctionItem },
    context,
    apolloClient,
  );
});

export default function CompleteAuctionPage({ track, auctionItem }: TrackPageProps) {
  const { cancelAuction } = useBlockchainV2();
  const { account, web3 } = useWalletContext();
  const [trackUpdate] = useUpdateTrackMutation();
  const [loading, setLoading] = useState(false);
  const me = useMe();
  const router = useRouter();

  if (!auctionItem) {
    return null;
  }

  const handleCancel = () => {
    if (!web3 || !account) {
      return;
    }
    const onReceipt = async () => {
      await trackUpdate({
        variables: {
          input: {
            trackId: track.id,
            nftData: {
              pendingRequest: PendingRequest.CancelAuction,
              pendingTime: new Date().toISOString(),
            },
          },
        },
      });
      router.back();
    };
    setLoading(true);

    cancelAuction(auctionItem.tokenId, account)
      .onReceipt(() => onReceipt)
      .onError(cause => toast.error(cause.message))
      .finally(() => setLoading(false))
      .execute(web3);
  };

  const topNovaBarProps: TopNavBarProps = {
    leftButton: <BackButton />,
    title: 'Cancel Auction',
  };

  if (!me || track.nftData?.pendingRequest != PendingRequest.None) {
    return null;
  }

  return (
    <>
      <SEO
        title={`Cancel auction | SoundChain`}
        description={`Cancel auction of ${track.title} - song by ${track.artist}.`}
        canonicalUrl={`/tracks/${track.id}/cancel-auction/`}
        image={track.artworkUrl}
      />
      <Layout topNavBarProps={topNovaBarProps}>
        <div className="m-4">
          <Track track={track} />
        </div>
        <div className="px-4 py-3">
          <MaxGasFee />
        </div>
        <PlayerAwareBottomBar>
          <Button className="ml-auto" variant="buy-nft" onClick={() => handleCancel()} loading={loading}>
            <div className="px-4">CANCEL AUCTION</div>
          </Button>
        </PlayerAwareBottomBar>
      </Layout>
    </>
  );
}
