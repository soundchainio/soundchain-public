import { Button } from 'components/Button';
import { BackButton } from 'components/Buttons/BackButton';
import { ListNFT } from 'components/details-NFT/ListNFT';
import { Layout } from 'components/Layout';
import { TopNavBarProps } from 'components/TopNavBar';
import { Track } from 'components/Track';
import { useModalDispatch } from 'contexts/providers/modal';
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
  useWasListedBeforeLazyQuery,
} from 'lib/graphql';
import { protectPage } from 'lib/protectPage';
import { useRouter } from 'next/router';
import { ParsedUrlQuery } from 'querystring';
import { useEffect, useState } from 'react';
import { Receipt } from 'types/NftTypes';

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

  return cacheFor(ListPage, { trackId }, context, apolloClient);
});

export default function ListPage({ trackId }: TrackPageProps) {
  const { listItem, isTokenOwner, isApproved: checkIsApproved } = useBlockchain();
  const router = useRouter();
  const me = useMe();
  const { data } = useTrackQuery({ variables: { id: trackId } });
  const [trackUpdate] = useUpdateTrackMutation();
  const { account, web3 } = useWalletContext();
  const maxGasFee = useMaxGasFee();
  const { dispatchShowApproveModal } = useModalDispatch();
  const [loading, setLoading] = useState(false);
  const [price, setPrice] = useState(0);
  const [royalty, setRoyalty] = useState(0);
  const [isOwner, setIsOwner] = useState(false);
  const [isApproved, setIsApproved] = useState(false);

  const tokenId = data?.track.nftData?.tokenId || -1;

  const [getListingItem, { data: listingItem }] = useListingItemLazyQuery({
    variables: { tokenId },
  });

  const [getWasListedBefore, { data: wasListedBefore }] = useWasListedBeforeLazyQuery({
    variables: { tokenId },
  });

  useEffect(() => {
    const fetchIsOwner = async () => {
      if (!account || !web3 || !data?.track.nftData?.tokenId || !isTokenOwner) {
        return;
      }
      const isTokenOwnerRes = await isTokenOwner(web3, data.track.nftData.tokenId, account);
      setIsOwner(isTokenOwnerRes);
    };
    fetchIsOwner();
  }, [account, web3, data?.track.nftData, isTokenOwner]);

  useEffect(() => {
    getListingItem();
  }, [getListingItem]);

  useEffect(() => {
    getWasListedBefore();
  }, [getWasListedBefore]);

  useEffect(() => {
    const fetchIsApproved = async () => {
      if (!web3 || !checkIsApproved || !account) return;

      const is = await checkIsApproved(web3, account);
      setIsApproved(is);
    };
    fetchIsApproved();
  }, [account, web3, checkIsApproved]);

  const isForSale = !!listingItem?.listingItem.pricePerItem ?? false;
  const isSetRoyalty = !wasListedBefore?.wasListedBefore;

  const handleList = () => {
    if (!data?.track.nftData?.tokenId || !account || !web3) {
      return;
    }
    setLoading(true);
    const weiPrice = web3?.utils.toWei(price.toString(), 'ether') || '0';

    if (isApproved) {
      listItem(web3, data.track.nftData.tokenId, 1, account, weiPrice, royalty * 100, onReceipt);
      trackUpdate({
        variables: {
          input: {
            trackId: trackId,
            nftData: {
              pendingRequest: PendingRequest.List,
            },
          },
        },
      });
      return;
    }
    me ? dispatchShowApproveModal(true) : router.push('/login');
  };

  const onReceipt = (receipt: Receipt) => {
    if (!receipt.events.ItemListed) {
      return;
    }
    router.back();
  };

  const topNovaBarProps: TopNavBarProps = {
    leftButton: <BackButton />,
    title: 'List for Sale',
  };

  if (!isOwner || isForSale || data?.track.nftData?.pendingRequest != PendingRequest.None) {
    return null;
  }

  return (
    <Layout topNavBarProps={topNovaBarProps}>
      <div className="m-4">
        <Track trackId={trackId} />
      </div>
      <ListNFT
        onSetPrice={price => setPrice(price)}
        isSetRoyalty={isSetRoyalty}
        onSetRoyalty={royalty => setRoyalty(royalty)}
      />
      <div className="flex p-4">
        <div className="flex-1 font-black text-xs text-gray-80">
          <p>Max gas fee</p>
          <div className="flex items-center gap-1">
            <Matic />
            <div className="text-white">{maxGasFee}</div>MATIC
          </div>
        </div>
        <Button variant="list-nft" disabled={price <= 0} onClick={handleList} loading={loading}>
          <div className="px-4 font-bold">LIST NFT</div>
        </Button>
      </div>
    </Layout>
  );
}
