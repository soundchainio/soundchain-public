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
  CreateListingItemInput,
  TrackDocument,
  useCreateListingItemMutation,
  useListingItemLazyQuery,
  useTrackQuery,
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

  return cacheFor(SellPage, { trackId }, context, apolloClient);
});

export default function SellPage({ trackId }: TrackPageProps) {
  const { listItem, isTokenOwner } = useBlockchain();
  const router = useRouter();
  const me = useMe();
  const { data } = useTrackQuery({ variables: { id: trackId } });
  const { account, web3 } = useWalletContext();
  const maxGasFee = useMaxGasFee();
  const { dispatchShowApproveModal } = useModalDispatch();
  const [createListingItem] = useCreateListingItemMutation();
  const [loading, setLoading] = useState(false);
  const [price, setPrice] = useState(0);
  const [isOwner, setIsOwner] = useState(false);

  const tokenId = data?.track.nftData?.tokenId || -1;

  const [getListingItem, { data: listingItem }] = useListingItemLazyQuery({
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

  const isForSale = !!listingItem?.listingItem.pricePerItem ?? false;
  const isApproved = me?.isApprovedOnMarketplace ?? false;

  const handleSell = () => {
    if (!data?.track.nftData?.tokenId || !account || !web3) {
      return;
    }
    setLoading(true);
    const weiPrice = web3?.utils.toWei(price.toString(), 'ether') || '0';

    if (isApproved) {
      listItem(web3, data.track.nftData.tokenId, 1, account, weiPrice, onReceipt);
      return;
    }
    me ? dispatchShowApproveModal(true) : router.push('/login');
  };

  const onReceipt = async (receipt: Receipt) => {
    if (!receipt.events.ItemListed) {
      return;
    }
    try {
      const { owner, nft, tokenId, quantity, pricePerItem, startingTime } = receipt.events.ItemListed.returnValues;
      const listingItemParams: CreateListingItemInput = {
        owner,
        nft,
        tokenId: parseInt(tokenId),
        quantity: parseInt(quantity),
        pricePerItem,
        startingTime: parseInt(startingTime),
      };
      await createListingItem({ variables: { input: listingItemParams }, fetchPolicy: 'no-cache' });
    } finally {
      setLoading(false);
      router.back();
    }
  };

  const topNovaBarProps: TopNavBarProps = {
    leftButton: <BackButton />,
    title: 'List for Sale',
  };

  if (!isOwner || isForSale) {
    return null;
  }

  return (
    <Layout topNavBarProps={topNovaBarProps}>
      <div className="m-4">
        <Track trackId={trackId} />
      </div>
      <ListNFT onSetPrice={price => setPrice(price)} />
      <div className="flex p-4">
        <div className="flex-1 font-black text-xs text-gray-80">
          <p>Max gas fee</p>
          <div className="flex items-center gap-1">
            <Matic />
            <div className="text-white">{maxGasFee}</div>MATIC
          </div>
        </div>
        <Button variant="list-nft" disabled={price <= 0} onClick={handleSell} loading={loading}>
          <div className="px-4 font-bold">LIST NFT</div>
        </Button>
      </div>
    </Layout>
  );
}
