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
import { ApproveType } from 'types/ApproveType';

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

  return cacheFor(ListBuyNowPage, { track: data.track }, context, apolloClient);
});

export default function ListBuyNowPage({ track }: TrackPageProps) {
  const { listItem, isTokenOwner, isApprovedMarketplace: checkIsApproved } = useBlockchain();
  const router = useRouter();
  const me = useMe();
  const [trackUpdate] = useUpdateTrackMutation();
  const { account, web3 } = useWalletContext();
  const { dispatchShowApproveModal } = useModalDispatch();
  const [loading, setLoading] = useState(false);
  const [price, setPrice] = useState(0);
  const [isOwner, setIsOwner] = useState(false);
  const [isApproved, setIsApproved] = useState(false);

  const nftData = track.nftData;
  const tokenId = track.nftData?.tokenId ?? -1;
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
  }, [account, web3, checkIsApproved]);

  const isForSale = !!buyNowItem?.buyNowItem?.buyNowItem?.pricePerItem ?? false;

  const handleList = () => {
    if (nftData?.tokenId === null || nftData?.tokenId === undefined || !account || !web3) {
      return;
    }
    setLoading(true);
    const weiPrice = web3?.utils.toWei(price.toString(), 'ether') || '0';

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
        router.push(router.asPath.replace('/list/buy-now', ''));
      };
      listItem(web3, nftData.tokenId, account, weiPrice, onTransactionHash);
    } else {
      me ? dispatchShowApproveModal(true, ApproveType.MARKETPLACE) : router.push('/login');
    }
  };

  const topNovaBarProps: TopNavBarProps = {
    leftButton: <BackButton />,
    title: 'List for Sale',
  };

  if (!isOwner || isForSale || nftData?.pendingRequest != PendingRequest.None || !canList) {
    return null;
  }

  return (
    <Layout topNavBarProps={topNovaBarProps}>
      <div className="m-4">
        <Track track={track} />
      </div>
      <ListNFTBuyNow onSetPrice={price => setPrice(price)} />
      <div className="flex p-4">
        <MaxGasFee />
        <Button variant="list-nft" disabled={price <= 0} onClick={handleList} loading={loading}>
          <div className="px-4 font-bold">LIST NFT</div>
        </Button>
      </div>
    </Layout>
  );
}
