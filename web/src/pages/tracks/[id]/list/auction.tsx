import { Button } from 'components/Button';
import { BackButton } from 'components/Buttons/BackButton';
import { ListNFTAuction } from 'components/details-NFT/ListNFTAuction';
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

  return cacheFor(AuctionPage, { track: data.track }, context, apolloClient);
});

export default function AuctionPage({ track }: TrackPageProps) {
  const { createAuction, isTokenOwner, isApprovedAuction: checkIsApproved } = useBlockchain();
  const router = useRouter();
  const me = useMe();
  const [trackUpdate] = useUpdateTrackMutation();
  const { account, web3 } = useWalletContext();
  const { dispatchShowApproveModal } = useModalDispatch();
  const [loading, setLoading] = useState(false);
  const [price, setPrice] = useState(0);
  const [duration, setDuration] = useState(0);
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
  }, [account, web3, checkIsApproved]);

  const isForSale = !!buyNowItem?.buyNowItem?.buyNowItem?.pricePerItem ?? false;

  const handleList = async () => {
    if (nftData?.tokenId === null || nftData?.tokenId === undefined || !account || !web3) {
      return;
    }
    setLoading(true);
    const weiPrice = web3?.utils.toWei(price.toString(), 'ether') || '0';
    const blockNumber = await web3.eth.getBlockNumber();
    const block = await web3.eth.getBlock(blockNumber);
    const blockTimeStamp = block.timestamp as number;
    const startTime = blockTimeStamp + 60;
    const endTime = startTime + duration * 3600;
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
      createAuction(web3, nftData.tokenId, weiPrice, startTime, endTime, account, onTransactionHash);
    } else {
      me ? dispatchShowApproveModal(true, ApproveType.AUCTION) : router.push('/login');
    }
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
      <ListNFTAuction onSetPrice={price => setPrice(price)} onSetDuration={duration => setDuration(duration)} />
      <div className="flex p-4">
        <MaxGasFee />
        <Button variant="list-nft" disabled={price <= 0} onClick={handleList} loading={loading}>
          <div className="px-4 font-bold">LIST NFT</div>
        </Button>
      </div>
    </Layout>
  );
}
