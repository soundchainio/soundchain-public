import { Button } from 'components/Button';
import { BackButton } from 'components/Buttons/BackButton';
import { ListNFTBuyNow } from 'components/details-NFT/ListNFTBuyNow';
import { Layout } from 'components/Layout';
import MaxGasFee from 'components/MaxGasFee';
import { TopNavBarProps } from 'components/TopNavBar';
import { Track } from 'components/Track';
import { useModalDispatch } from 'contexts/providers/modal';
import useBlockchain from 'hooks/useBlockchain';
import { useMe } from 'hooks/useMe';
import { useWalletContext } from 'hooks/useWalletContext';
import { cacheFor } from 'lib/apollo';
import { PendingRequest, TrackDocument, TrackQuery, useBuyNowItemLazyQuery, useUpdateTrackMutation } from 'lib/graphql';
import { protectPage } from 'lib/protectPage';
import { useRouter } from 'next/router';
import { ParsedUrlQuery } from 'querystring';
import { useEffect, useState } from 'react';
import { SaleType } from 'types/SaleType';

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

  return cacheFor(EditBuyNowPage, { track: data.track }, context, apolloClient);
});

export default function EditBuyNowPage({ track }: TrackPageProps) {
  const router = useRouter();
  const { updateListing } = useBlockchain();
  const { dispatchShowRemoveListingModal } = useModalDispatch();
  const [trackUpdate] = useUpdateTrackMutation();
  const { account, web3 } = useWalletContext();
  const [loading, setLoading] = useState(false);
  const [newPrice, setNewPrice] = useState(0);
  const me = useMe();

  const nftData = track.nftData;
  const tokenId = nftData?.tokenId ?? -1;

  const [getBuyNowItem, { data: listingPayload }] = useBuyNowItemLazyQuery({
    variables: { tokenId },
  });

  useEffect(() => {
    getBuyNowItem();
  }, [getBuyNowItem]);

  if (!listingPayload) {
    return null;
  }

  const ownerAddressAccount = listingPayload.buyNowItem?.buyNowItem?.owner.toLowerCase();
  const isOwner = ownerAddressAccount === account?.toLowerCase();
  const isForSale = !!listingPayload.buyNowItem?.buyNowItem?.pricePerItem ?? false;
  const price = web3?.utils.fromWei(listingPayload.buyNowItem?.buyNowItem?.pricePerItem.toString() || '0', 'ether');

  const handleUpdate = () => {
    if (!web3 || !listingPayload.buyNowItem?.buyNowItem?.tokenId || !newPrice || !account) {
      return;
    }
    setLoading(true);
    const weiPrice = web3?.utils.toWei(newPrice.toString(), 'ether') || '0';

    const onTransactionHash = () => {
      trackUpdate({
        variables: {
          input: {
            trackId: track.id,
            nftData: {
              pendingRequest: PendingRequest.UpdateListing,
            },
          },
        },
      });
      router.back();
    };

    updateListing(web3, listingPayload.buyNowItem?.buyNowItem?.tokenId, account, weiPrice, onTransactionHash);
  };

  const handleRemove = () => {
    if (
      !web3 ||
      !listingPayload.buyNowItem?.buyNowItem?.tokenId ||
      !account ||
      nftData?.pendingRequest != PendingRequest.None
    ) {
      return;
    }
    dispatchShowRemoveListingModal(
      true,
      listingPayload.buyNowItem?.buyNowItem?.tokenId,
      track.id,
      SaleType.MARKETPLACE,
    );
  };

  const RemoveListing = (
    <div className="flex-shrink-0 flex items-center cursor-pointer">
      <h2 className="text-sm text-red-400 font-bold" onClick={handleRemove}>
        Remove Listing
      </h2>
    </div>
  );

  const topNovaBarProps: TopNavBarProps = {
    leftButton: <BackButton />,
    title: 'Edit Listing',
    rightButton: RemoveListing,
  };

  if (!isForSale || !isOwner || !me || !track || nftData?.pendingRequest != PendingRequest.None) {
    return null;
  }

  return (
    <Layout topNavBarProps={topNovaBarProps}>
      <div className="m-4">
        <Track track={track} />
      </div>
      {price && <ListNFTBuyNow onSetPrice={setNewPrice} initialPrice={parseFloat(price)} />}
      <div className="flex p-4">
        <MaxGasFee />
        <Button variant="edit-listing" onClick={handleUpdate} loading={loading}>
          <div className="px-4">EDIT LISTING</div>
        </Button>
      </div>
    </Layout>
  );
}
