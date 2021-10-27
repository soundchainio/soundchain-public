import { Button } from 'components/Button';
import { BackButton } from 'components/Buttons/BackButton';
import { ListNFT } from 'components/details-NFT/ListNFT';
import { Layout } from 'components/Layout';
import { TopNavBarProps } from 'components/TopNavBar';
import { Track } from 'components/Track';
import useBlockchain from 'hooks/useBlockchain';
import { useMaxGasFee } from 'hooks/useMaxGasFee';
import { useMe } from 'hooks/useMe';
import { useWalletContext } from 'hooks/useWalletContext';
import { Matic } from 'icons/Matic';
import { cacheFor } from 'lib/apollo';
import { TrackDocument, useListingItemLazyQuery, useTrackQuery } from 'lib/graphql';
import { protectPage } from 'lib/protectPage';
import { ParsedUrlQuery } from 'querystring';
import { useEffect, useState } from 'react';

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

  return cacheFor(EditPage, { trackId }, context, apolloClient);
});

export default function EditPage({ trackId }: TrackPageProps) {
  const { updateListing, cancelListing } = useBlockchain();
  const { data: track } = useTrackQuery({ variables: { id: trackId } });
  const { account, web3 } = useWalletContext();
  const maxGasFee = useMaxGasFee();
  const [loading, setLoading] = useState(false);
  const [newPrice, setNewPrice] = useState(0);
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

  console.log(account);

  const ownerAddressAccount = listingItem.listingItem.owner.toLowerCase();
  const isOwner = ownerAddressAccount === account?.toLowerCase();
  const isForSale = !!listingItem.listingItem.pricePerItem ?? false;
  const price = web3?.utils.fromWei(listingItem.listingItem.pricePerItem.toString(), 'ether') || '0';

  const handleUpdate = () => {
    if (!web3 || !listingItem.listingItem.tokenId || !newPrice || !account) {
      return;
    }
    updateListing(web3, listingItem.listingItem.tokenId, account, newPrice);
    setLoading(true);
  };

  const handleRemove = () => {
    if (!web3 || !listingItem.listingItem.tokenId || !account) {
      return;
    }
    cancelListing(web3, listingItem.listingItem.tokenId, account);
    setLoading(true);
  };

  const rightButton = () => {
    return <div onClick={handleRemove}>Remove Listing</div>;
  };

  const topNovaBarProps: TopNavBarProps = {
    leftButton: <BackButton />,
    title: 'Confirm Purchase',
    rightButton: rightButton(),
  };

  if (!isForSale || !isOwner || !me || !track) {
    return null;
  }

  return (
    <Layout topNavBarProps={topNovaBarProps}>
      <div className="m-4">
        <Track trackId={trackId} />
      </div>
      <ListNFT onSetPrice={setNewPrice} initialPrice={parseFloat(price)} />
      <div className="flex p-4">
        <div className="flex-1 font-black text-xs text-gray-80">
          <p>Max gas fee</p>
          <div className="flex items-center gap-1">
            <Matic />
            <div className="text-white">{maxGasFee}</div>MATIC
          </div>
        </div>
        <Button variant="edit-listing" onClick={handleUpdate} loading={loading}>
          <div className="px-4">EDIT LISTING</div>
        </Button>
      </div>
    </Layout>
  );
}
