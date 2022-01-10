import { BackButton } from 'components/Buttons/BackButton';
import { ListNFTAuction, ListNFTAuctionFormValues } from 'components/details-NFT/ListNFTAuction';
import { Layout } from 'components/Layout';
import { TopNavBarProps } from 'components/TopNavBar';
import { Track } from 'components/Track';
import { useModalDispatch } from 'contexts/providers/modal';
import useBlockchain from 'hooks/useBlockchain';
import { useMe } from 'hooks/useMe';
import { useWalletContext } from 'hooks/useWalletContext';
import { cacheFor } from 'lib/apollo';
import { PendingRequest, TrackDocument, TrackQuery, useAuctionItemQuery, useUpdateTrackMutation } from 'lib/graphql';
import { protectPage } from 'lib/protectPage';
import { useRouter } from 'next/router';
import { ParsedUrlQuery } from 'querystring';
import React from 'react';
import { SaleType } from 'types/SaleType';
import { compareWallets } from 'utils/Wallet';
import SEO from '../../../../components/SEO';

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
  const { updateAuction } = useBlockchain();
  const { dispatchShowRemoveListingModal } = useModalDispatch();
  const [trackUpdate] = useUpdateTrackMutation();
  const { account, web3 } = useWalletContext();
  const me = useMe();

  const nftData = track.nftData;
  const tokenId = nftData?.tokenId ?? -1;

  const { data: listingPayload } = useAuctionItemQuery({
    variables: { tokenId },
  });

  if (!listingPayload) {
    return null;
  }

  const isOwner = compareWallets(listingPayload.auctionItem?.auctionItem?.owner, account);
  const isForSale = !!listingPayload.auctionItem?.auctionItem?.reservePrice ?? false;
  const startPrice =
    web3?.utils.fromWei(
      listingPayload.auctionItem.auctionItem?.reservePrice.toLocaleString('fullwide', { useGrouping: false }) || '0',
      'ether',
    ) ?? '0';
  const startingTime = listingPayload.auctionItem.auctionItem?.startingTime
    ? new Date(listingPayload.auctionItem.auctionItem?.startingTime * 1000)
    : undefined;
  const endingTime = listingPayload.auctionItem.auctionItem?.endingTime
    ? new Date(listingPayload.auctionItem.auctionItem?.endingTime * 1000)
    : undefined;

  const handleUpdate = ({ price, startTime, endTime }: ListNFTAuctionFormValues) => {
    if (!web3 || !listingPayload.auctionItem?.auctionItem?.tokenId || !account) {
      return;
    }
    const weiPrice = web3?.utils.toWei(price.toString(), 'ether') || '0';
    const startTimestamp = startTime.getTime() / 1000;
    const endTimestamp = endTime.getTime() / 1000;

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

    updateAuction(
      web3,
      listingPayload.auctionItem?.auctionItem?.tokenId,
      account,
      weiPrice,
      startTimestamp,
      endTimestamp,
      onTransactionHash,
    );
  };

  const handleRemove = () => {
    if (
      !web3 ||
      !listingPayload.auctionItem?.auctionItem?.tokenId ||
      !account ||
      nftData?.pendingRequest != PendingRequest.None
    ) {
      return;
    }
    dispatchShowRemoveListingModal(true, listingPayload.auctionItem?.auctionItem?.tokenId, track.id, SaleType.AUCTION);
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
    <>
      <SEO title={`Soundchain - Edit Listing`} description={'Edit Auction Listing'} canonicalUrl={router.asPath} />
      <Layout topNavBarProps={topNovaBarProps}>
        <div className="m-4">
          <Track track={track} />
        </div>
        <ListNFTAuction
          handleSubmit={handleUpdate}
          submitLabel="UPDATE LISTING"
          initialValues={{ price: parseFloat(startPrice), startTime: startingTime, endTime: endingTime }}
        />
      </Layout>
    </>
  );
}
