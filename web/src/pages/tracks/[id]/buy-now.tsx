import { Button } from 'components/Button';
import { BackButton } from 'components/Buttons/BackButton';
import { BuyNow } from 'components/details-NFT/BuyNow';
import { Layout } from 'components/Layout';
import MaxGasFee from 'components/MaxGasFee';
import { TopNavBarProps } from 'components/TopNavBar';
import { Track } from 'components/Track';
import useBlockchain from 'hooks/useBlockchain';
import { useMe } from 'hooks/useMe';
import { useWalletContext } from 'hooks/useWalletContext';
import { cacheFor } from 'lib/apollo';
import { PendingRequest, TrackDocument, TrackQuery, useBuyNowItemLazyQuery, useUpdateTrackMutation } from 'lib/graphql';
import { protectPage } from 'lib/protectPage';
import { useRouter } from 'next/router';
import { ParsedUrlQuery } from 'querystring';
import { useEffect, useState } from 'react';

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

  return cacheFor(BuyNowPage, { track: data.track }, context, apolloClient);
});

export default function BuyNowPage({ track }: TrackPageProps) {
  const { buyItem } = useBlockchain();
  const { account, web3 } = useWalletContext();
  const [trackUpdate] = useUpdateTrackMutation();
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const me = useMe();

  const nftData = track.nftData;
  const tokenId = nftData?.tokenId ?? -1;

  const [getBuyNowItem, { data: listingPayload }] = useBuyNowItemLazyQuery({
    variables: { tokenId },
    fetchPolicy: 'network-only',
  });

  useEffect(() => {
    getBuyNowItem();
  }, [getBuyNowItem]);

  if (!listingPayload) {
    return null;
  }

  const isOwner = listingPayload.buyNowItem?.buyNowItem?.owner.toLowerCase() === account?.toLowerCase();
  const isForSale = !!listingPayload.buyNowItem?.buyNowItem?.pricePerItem ?? false;
  const price = web3?.utils.fromWei(listingPayload.buyNowItem?.buyNowItem?.pricePerItem.toString() || '0', 'ether');
  const hasStarted = (listingPayload.buyNowItem?.buyNowItem?.startingTime ?? 0) <= new Date().getTime() / 1000;

  const handleBuy = () => {
    if (
      !web3 ||
      !listingPayload.buyNowItem?.buyNowItem?.tokenId ||
      !listingPayload.buyNowItem?.buyNowItem?.owner ||
      !account
    ) {
      return;
    }

    const onTransactionHash = async () => {
      await trackUpdate({
        variables: {
          input: {
            trackId: track.id,
            nftData: {
              pendingRequest: PendingRequest.Buy,
            },
          },
        },
      });
      router.push(router.asPath.replace('buy-now', ''));
    };

    buyItem(
      web3,
      listingPayload.buyNowItem?.buyNowItem?.tokenId,
      account,
      listingPayload.buyNowItem?.buyNowItem?.owner,
      listingPayload.buyNowItem?.buyNowItem?.pricePerItem.toString(),
      onTransactionHash,
    );
    setLoading(true);
  };

  const topNovaBarProps: TopNavBarProps = {
    leftButton: <BackButton />,
    title: 'Confirm Purchase',
  };

  if (!isForSale || isOwner || !me || nftData?.pendingRequest != PendingRequest.None) {
    return null;
  }

  return (
    <Layout topNavBarProps={topNovaBarProps}>
      <div className="m-4">
        <Track track={track} />
      </div>
      {price && account && (
        <BuyNow
          price={price}
          ownerAddressAccount={account}
          startTime={listingPayload.buyNowItem?.buyNowItem?.startingTime ?? 0}
        />
      )}
      {hasStarted && (
        <div className="flex p-4">
          <MaxGasFee />
          <Button variant="buy-nft" onClick={handleBuy} loading={loading}>
            <div className="px-4">BUY NFT</div>
          </Button>
        </div>
      )}
    </Layout>
  );
}
