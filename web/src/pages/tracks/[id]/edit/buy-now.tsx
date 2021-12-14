import React from 'react';
import { BackButton } from 'components/Buttons/BackButton';
import { ListNFTBuyNow, ListNFTBuyNowFormValues } from 'components/details-NFT/ListNFTBuyNow';
import { Layout } from 'components/Layout';
import { TopNavBarProps } from 'components/TopNavBar';
import { Track } from 'components/Track';
import { useModalDispatch } from 'contexts/providers/modal';
import useBlockchain from 'hooks/useBlockchain';
import { useMe } from 'hooks/useMe';
import { useWalletContext } from 'hooks/useWalletContext';
import { cacheFor } from 'lib/apollo';
import { PendingRequest, TrackDocument, TrackQuery, useBuyNowItemQuery, useUpdateTrackMutation } from 'lib/graphql';
import { protectPage } from 'lib/protectPage';
import { useRouter } from 'next/router';
import { ParsedUrlQuery } from 'querystring';
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
  const me = useMe();

  const nftData = track.nftData;
  const tokenId = nftData?.tokenId ?? -1;

  const { data: listingPayload } = useBuyNowItemQuery({
    variables: { tokenId },
    fetchPolicy: 'network-only',
  });

  if (!listingPayload) {
    return null;
  }

  const ownerAddressAccount = listingPayload.buyNowItem?.buyNowItem?.owner.toLowerCase();
  const isOwner = ownerAddressAccount === account?.toLowerCase();
  const isForSale = !!listingPayload.buyNowItem?.buyNowItem?.pricePerItem ?? false;
  const price =
    web3?.utils.fromWei(
      listingPayload.buyNowItem?.buyNowItem?.pricePerItem.toLocaleString('fullwide', { useGrouping: false }) || '0',
      'ether',
    ) ?? '0';

  const startingDate = listingPayload.buyNowItem?.buyNowItem?.startingTime
    ? new Date(listingPayload.buyNowItem.buyNowItem.startingTime * 1000)
    : undefined;

  const handleUpdate = ({ price: newPrice, startTime }: ListNFTBuyNowFormValues) => {
    if (!web3 || !listingPayload.buyNowItem?.buyNowItem?.tokenId || !newPrice || !account) {
      return;
    }
    const weiPrice = web3?.utils.toWei(newPrice.toString(), 'ether') || '0';
    const startTimestamp = startTime.getTime() / 1000;

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

    updateListing(
      web3,
      listingPayload.buyNowItem?.buyNowItem?.tokenId,
      account,
      weiPrice,
      startTimestamp,
      onTransactionHash,
    );
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

      <ListNFTBuyNow
        submitLabel="EDIT LISTING"
        handleSubmit={handleUpdate}
        initialValues={{ price: parseFloat(price), startTime: startingDate }}
      />
    </Layout>
  );
}
