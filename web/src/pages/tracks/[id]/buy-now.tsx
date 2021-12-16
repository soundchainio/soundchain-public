import { Button } from 'components/Button';
import { BackButton } from 'components/Buttons/BackButton';
import { BuyNow } from 'components/details-NFT/BuyNow';
import { Layout } from 'components/Layout';
import MaxGasFee from 'components/MaxGasFee';
import PlayerAwareBottomBar from 'components/PlayerAwareBottomBar';
import { TopNavBarProps } from 'components/TopNavBar';
import { Track } from 'components/Track';
import useBlockchain from 'hooks/useBlockchain';
import { useMe } from 'hooks/useMe';
import { useWalletContext } from 'hooks/useWalletContext';
import { Matic } from 'icons/Matic';
import { cacheFor } from 'lib/apollo';
import { PendingRequest, TrackDocument, TrackQuery, useBuyNowItemLazyQuery, useUpdateTrackMutation } from 'lib/graphql';
import { protectPage } from 'lib/protectPage';
import { useRouter } from 'next/router';
import { ParsedUrlQuery } from 'querystring';
import { useEffect, useState } from 'react';
import { Timer } from '../[id]';

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
  const price = web3?.utils.fromWei(
    listingPayload.buyNowItem?.buyNowItem?.pricePerItem.toLocaleString('fullwide', { useGrouping: false }) || '0',
    'ether',
  );
  const startTime = listingPayload.buyNowItem?.buyNowItem?.startingTime ?? 0;
  const hasStarted = startTime <= new Date().getTime() / 1000;

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

  const topNavBarProps: TopNavBarProps = {
    leftButton: <BackButton />,
    title: 'Confirm Purchase',
  };

  if (!isForSale || isOwner || !me || nftData?.pendingRequest != PendingRequest.None) {
    return null;
  }

  return (
    <Layout topNavBarProps={topNavBarProps}>
      <div className="m-4">
        <Track track={track} />
      </div>
      <div className="bg-[#112011]">
        <div className="flex justify-between items-center px-4 py-3">
          <div className="text-sm font-bold text-white">BUY NOW PRICE</div>
          <div className="text-md flex items-center font-bold gap-1">
            <Matic />
            <span className="text-white">{price}</span>
            <span className="text-xxs text-gray-80">MATIC</span>
          </div>
        </div>
        {!hasStarted && (
          <div className="flex justify-between items-center px-4 py-3">
            <div className="text-sm font-bold text-white flex-shrink-0">SALE STARTS</div>
            <div className="text-md flex items-center text-right font-bold gap-1">
              <Timer date={new Date(startTime * 1000)} reloadOnEnd />
            </div>
          </div>
        )}
      </div>
      {price && account && <BuyNow price={price} ownerAddressAccount={account} startTime={startTime} />}
      {hasStarted && (
        <PlayerAwareBottomBar>
          <MaxGasFee />
          <Button variant="buy-nft" onClick={handleBuy} loading={loading}>
            <div className="px-4">BUY NFT</div>
          </Button>
        </PlayerAwareBottomBar>
      )}
    </Layout>
  );
}
