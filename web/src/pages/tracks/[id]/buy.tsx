import { BottomSheet } from 'components/BottomSheet';
import { Button } from 'components/Button';
import { BackButton } from 'components/Buttons/BackButton';
import { BuyNFT } from 'components/details-NFT/BuyNFT';
import { Layout } from 'components/Layout';
import { TopNavBarProps } from 'components/TopNavBar';
import { Track } from 'components/Track';
import { useMagicContext } from 'hooks/useMagicContext';
import { cacheFor, createApolloClient } from 'lib/apollo';
import { buyItem } from 'lib/blockchain';
import { TrackDocument, useListingItemLazyQuery, useSetNotValidMutation, useTrackQuery } from 'lib/graphql';
import { GetServerSideProps } from 'next';
import { ParsedUrlQuery } from 'querystring';
import { useEffect } from 'react';
import { Receipt } from 'types/NftTypes';

export interface TrackPageProps {
  trackId: string;
}

interface TrackPageParams extends ParsedUrlQuery {
  id: string;
}

export const getServerSideProps: GetServerSideProps<TrackPageProps, TrackPageParams> = async context => {
  const trackId = context.params?.id;

  if (!trackId) {
    return { notFound: true };
  }

  const apolloClient = createApolloClient(context);

  const { error } = await apolloClient.query({
    query: TrackDocument,
    variables: { id: trackId },
    context,
  });

  if (error) {
    return { notFound: true };
  }

  return cacheFor(BuyPage, { trackId }, context, apolloClient);
};

export default function BuyPage({ trackId }: TrackPageProps) {
  const { data } = useTrackQuery({ variables: { id: trackId } });
  const { account, web3, balance } = useMagicContext();
  const [setNotValid] = useSetNotValidMutation();

  const tokenId = data?.track.nftData?.tokenId || -1;

  const [getListingItem, { data: listingItem }] = useListingItemLazyQuery({
    variables: { tokenId },
  });

  useEffect(() => {
    getListingItem();
  }, [getListingItem]);

  if (!listingItem) {
    return <div></div>;
  }

  const isOwner = listingItem.listingItem.owner.toLowerCase() === account?.toLowerCase();
  const isForSale = !!listingItem.listingItem.pricePerItem ?? false;
  const price = web3.utils.fromWei(listingItem.listingItem.pricePerItem.toString(), 'ether');
  const parsedBalance = parseInt(balance || '0');

  const handleBuy = () => {
    if (!web3 || !data?.track.nftData?.tokenId || !data?.track.nftData?.minter || !account) {
      return;
    }
    buyItem(web3, data?.track.nftData.tokenId, account, data?.track.nftData.minter, price, onReceipt);
  };

  const onReceipt = async (receipt: Receipt) => {
    if (!receipt.events.ItemSold) {
      return;
    }
    const { tokenId } = receipt.events.ItemSold.returnValues;
    await setNotValid({ variables: { tokenId: parseInt(tokenId) } });
  };

  const topNovaBarProps: TopNavBarProps = {
    leftButton: <BackButton />,
    title: 'Confirm Purchase',
  };

  if (!isForSale || isOwner) {
    return <div></div>;
  }

  return (
    <Layout topNavBarProps={topNovaBarProps}>
      <div className="m-4">
        <Track trackId={trackId} />
      </div>
      <BuyNFT price={price} balance={balance || '0'} />
      <BottomSheet>
        <div className="flex justify-center pb-3">
          <Button variant="buy-nft" onClick={handleBuy} disabled={false}>
            <div className="px-4">BUY NFT</div>
          </Button>
        </div>
      </BottomSheet>
    </Layout>
  );
}
