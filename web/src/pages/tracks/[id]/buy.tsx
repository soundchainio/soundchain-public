import { Button } from 'components/Button';
import { BackButton } from 'components/Buttons/BackButton';
import { BuyNFT } from 'components/details-NFT/BuyNFT';
import { Layout } from 'components/Layout';
import { TopNavBarProps } from 'components/TopNavBar';
import { Track } from 'components/Track';
import useBlockchain from 'hooks/useBlockchain';
import { useMaxGasFee } from 'hooks/useMaxGasFee';
import { useMe } from 'hooks/useMe';
import { useWalletContext } from 'hooks/useWalletContext';
import { Matic } from 'icons/Matic';
import { cacheFor } from 'lib/apollo';
import {
  PendingRequest,
  TrackDocument,
  useListingItemLazyQuery,
  useTrackQuery,
  useUpdateTrackMutation,
} from 'lib/graphql';
import { protectPage } from 'lib/protectPage';
import { useRouter } from 'next/router';
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

  return cacheFor(BuyPage, { trackId }, context, apolloClient);
});

export default function BuyPage({ trackId }: TrackPageProps) {
  const { buyItem } = useBlockchain();
  const { data: track } = useTrackQuery({ variables: { id: trackId } });
  const { account, web3 } = useWalletContext();
  const [trackUpdate] = useUpdateTrackMutation();
  const maxGasFee = useMaxGasFee();
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const me = useMe();

  const tokenId = track?.track.nftData?.tokenId || -1;

  const [getListingItem, { data: listingPayload }] = useListingItemLazyQuery({
    variables: { tokenId },
  });

  useEffect(() => {
    getListingItem();
  }, [getListingItem]);

  if (!listingPayload) {
    return null;
  }

  const ownerAddressAccount = listingPayload.listingItem?.listingItem?.owner.toLowerCase();
  const isOwner = ownerAddressAccount === account?.toLowerCase();
  const isForSale = !!listingPayload.listingItem?.listingItem?.pricePerItem ?? false;
  const price = web3?.utils.fromWei(listingPayload.listingItem?.listingItem?.pricePerItem.toString() || '0', 'ether');

  const handleBuy = () => {
    if (
      !web3 ||
      !listingPayload.listingItem?.listingItem?.tokenId ||
      !listingPayload.listingItem?.listingItem?.owner ||
      !account
    ) {
      return;
    }

    const onTransactionHash = async () => {
      await trackUpdate({
        variables: {
          input: {
            trackId: trackId,
            nftData: {
              pendingRequest: PendingRequest.Buy,
            },
          },
        },
      });
      router.push(router.asPath.replace('buy', ''));
    };

    buyItem(
      web3,
      listingPayload.listingItem?.listingItem?.tokenId,
      account,
      listingPayload.listingItem?.listingItem?.owner,
      listingPayload.listingItem?.listingItem?.pricePerItem.toString(),
      onTransactionHash,
    );
    setLoading(true);
  };

  const topNovaBarProps: TopNavBarProps = {
    leftButton: <BackButton />,
    title: 'Confirm Purchase',
  };

  if (!isForSale || isOwner || !me || track?.track.nftData?.pendingRequest != PendingRequest.None) {
    return null;
  }

  return (
    <Layout topNavBarProps={topNovaBarProps}>
      <div className="m-4">
        <Track trackId={trackId} />
      </div>
      {price && ownerAddressAccount && <BuyNFT price={price} ownerAddressAccount={ownerAddressAccount} />}
      <div className="flex p-4">
        <div className="flex-1 font-black text-xs text-gray-80">
          <p>Max gas fee</p>
          <div className="flex items-center gap-1">
            <Matic />
            <div className="text-white">{maxGasFee}</div>MATIC
          </div>
        </div>
        <Button variant="buy-nft" onClick={handleBuy} loading={loading}>
          <div className="px-4">BUY NFT</div>
        </Button>
      </div>
    </Layout>
  );
}
