import { BackButton } from 'components/Buttons/BackButton';
import { ListNFTAuction, ListNFTAuctionFormValues } from 'components/details-NFT/ListNFTAuction';
import { Layout } from 'components/Layout';
import { TopNavBarProps } from 'components/TopNavBar';
import { Track } from 'components/Track';
import { useModalDispatch, useModalState } from 'contexts/providers/modal';
import { FormikHelpers } from 'formik';
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

  return cacheFor(AuctionPage, { track: data.track }, context, apolloClient);
});

export default function AuctionPage({ track }: TrackPageProps) {
  const { createAuction, isTokenOwner, isApprovedAuction: checkIsApproved } = useBlockchain();
  const router = useRouter();
  const me = useMe();
  const [trackUpdate] = useUpdateTrackMutation();
  const { account, web3 } = useWalletContext();
  const { showApprove } = useModalState();
  const { dispatchShowApproveModal } = useModalDispatch();
  const [isOwner, setIsOwner] = useState(false);
  const [isApproved, setIsApproved] = useState(false);

  const nftData = track.nftData;
  const tokenId = nftData?.tokenId ?? -1;
  const canList = (me?.profile.verified && nftData?.minter === account) || nftData?.minter != account;

  const [getBuyNowItem, { data: buyNowItem }] = useBuyNowItemLazyQuery({
    variables: { tokenId },
  });

  useEffect(() => {
    const fetchIsOwner = async () => {
      if (!account || !web3 || nftData?.tokenId === null || nftData?.tokenId === undefined || !isTokenOwner) {
        return;
      }
      const isTokenOwnerRes = await isTokenOwner(web3, nftData.tokenId, account);
      setIsOwner(isTokenOwnerRes);
    };
    fetchIsOwner();
  }, [account, web3, nftData, isTokenOwner]);

  useEffect(() => {
    getBuyNowItem();
  }, [getBuyNowItem]);

  useEffect(() => {
    const fetchIsApproved = async () => {
      if (!web3 || !checkIsApproved || !account) return;
      const is = await checkIsApproved(web3, account);
      setIsApproved(is);
    };
    fetchIsApproved();
  }, [account, web3, checkIsApproved, showApprove]);

  const isForSale = !!buyNowItem?.buyNowItem?.buyNowItem?.pricePerItem ?? false;

  const handleList = (
    { price, startTime, endTime }: ListNFTAuctionFormValues,
    helper: FormikHelpers<ListNFTAuctionFormValues>,
  ) => {
    if (nftData?.tokenId === null || nftData?.tokenId === undefined || !account || !web3) {
      return;
    }
    const weiPrice = web3?.utils.toWei(price.toString(), 'ether') || '0';
    const startTimestamp = Math.ceil(startTime.getTime() / 1000);
    const endTimestamp = Math.ceil(endTime.getTime() / 1000);
    if (isApproved) {
      const onTransactionHash = async () => {
        await trackUpdate({
          variables: {
            input: {
              trackId: track.id,
              nftData: {
                pendingRequest: PendingRequest.List,
              },
            },
          },
        });
        router.push(router.asPath.replace('/list/auction', ''));
      };
      createAuction(web3, nftData.tokenId, weiPrice, startTimestamp, endTimestamp, account, onTransactionHash);
    } else {
      me ? dispatchShowApproveModal(true, SaleType.AUCTION) : router.push('/login');
    }
    helper.setSubmitting(false);
  };

  const topNovaBarProps: TopNavBarProps = {
    leftButton: <BackButton />,
    title: 'List for Auction',
  };

  if (!isOwner || isForSale || nftData?.pendingRequest != PendingRequest.None || !canList) {
    return null;
  }

  return (
    <Layout topNavBarProps={topNovaBarProps}>
      <div className="m-4">
        <Track track={track} />
      </div>
      <ListNFTAuction handleSubmit={handleList} submitLabel="LIST NFT" />
    </Layout>
  );
}
