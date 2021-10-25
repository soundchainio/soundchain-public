import { Button } from 'components/Button';
import { BackButton } from 'components/Buttons/BackButton';
import { BuyNFT } from 'components/details-NFT/BuyNFT';
import { Layout } from 'components/Layout';
import { TopNavBarProps } from 'components/TopNavBar';
import { Track } from 'components/Track';
import useBlockchain from 'hooks/useBlockchain';
import { useMe } from 'hooks/useMe';
import { useWalletContext } from 'hooks/useWalletContext';
import { cacheFor } from 'lib/apollo';
import {
  ListingItemDocument,
  TrackDocument,
  useFinishListingMutation,
  useListingItemLazyQuery,
  useTrackQuery,
  useUpdateTrackMutation,
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

  return cacheFor(BuyPage, { trackId }, context, apolloClient);
});

export default function BuyPage({ trackId }: TrackPageProps) {
  const { buyItem } = useBlockchain();
  const { data: track } = useTrackQuery({ variables: { id: trackId } });
  const { account, web3 } = useWalletContext();
  const [updateTrack] = useUpdateTrackMutation();
  const [finishListing] = useFinishListingMutation();
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const me = useMe();

  const tokenId = track?.track.nftData?.tokenId || -1;

  const [getListingItem, { data: listingItem }] = useListingItemLazyQuery({
    variables: { tokenId },
  });

  useEffect(() => {
    getListingItem();
  }, [getListingItem]);

  if (!listingItem) {
    return null;
  }

  const ownerAddressAccount = listingItem.listingItem.owner.toLowerCase();
  const isOwner = ownerAddressAccount === account?.toLowerCase();
  const isForSale = !!listingItem.listingItem.pricePerItem ?? false;
  const price = web3?.utils.fromWei(listingItem.listingItem.pricePerItem.toString(), 'ether') || '0';

  const handleBuy = () => {
    if (!web3 || !listingItem.listingItem.tokenId || !listingItem.listingItem.owner || !account) {
      return;
    }
    buyItem(
      web3,
      listingItem.listingItem.tokenId,
      account,
      listingItem.listingItem.owner,
      listingItem.listingItem.pricePerItem.toString(),
      onReceipt,
    );
    setLoading(true);
  };

  const onReceipt = async (receipt: Receipt) => {
    try {
      if (!receipt.events.ItemSold || !me || !track) {
        return;
      }
      const { tokenId } = receipt.events.ItemSold.returnValues;

      await finishListing({
        variables: {
          input: {
            trackId: trackId,
            buyerProfileId: me.profile.id,
            price: price,
            sellerProfileId: track.track.profileId,
            tokenId: parseInt(tokenId),
          },
        },
        refetchQueries: [ListingItemDocument],
        fetchPolicy: 'no-cache',
      });

      await updateTrack({
        variables: {
          input: {
            trackId: trackId,
            profileId: me?.profile.id,
          },
        },
      });
    } finally {
      router.push(router.asPath.replace('buy', ''));
      setLoading(false);
    }
  };

  const topNovaBarProps: TopNavBarProps = {
    leftButton: <BackButton />,
    title: 'Confirm Purchase',
  };

  if (!isForSale || isOwner || !me || !track) {
    return null;
  }

  return (
    <Layout topNavBarProps={topNovaBarProps}>
      <div className="m-4">
        <Track trackId={trackId} />
      </div>
      <BuyNFT price={price} ownerAddressAccount={ownerAddressAccount} />
      <div className="flex justify-center mt-6">
        <Button className="w-40" variant="buy-nft" onClick={handleBuy} loading={loading}>
          <div className="px-4">BUY NFT</div>
        </Button>
      </div>
    </Layout>
  );
}
