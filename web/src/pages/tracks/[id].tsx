import { BackButton } from 'components/Buttons/BackButton';
import { Description } from 'components/details-NFT/Description';
import { HandleNFT } from 'components/details-NFT/HandleNFT';
import { MintingData } from 'components/details-NFT/MintingData';
import { TrackInfo } from 'components/details-NFT/TrackInfo';
import { Layout } from 'components/Layout';
import { TopNavBarProps } from 'components/TopNavBar';
import { Track } from 'components/Track';
import useBlockchain from 'hooks/useBlockchain';
import { useWalletContext } from 'hooks/useWalletContext';
import { cacheFor } from 'lib/apollo';
import { TrackDocument, useListingItemQuery, useTrackQuery } from 'lib/graphql';
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

  return cacheFor(TrackPage, { trackId }, context, apolloClient);
});

export default function TrackPage({ trackId }: TrackPageProps) {
  const { account, web3 } = useWalletContext();
  const { data } = useTrackQuery({ variables: { id: trackId } });
  const { isTokenOwner } = useBlockchain();
  const [isOwner, setIsOwner] = useState<boolean>();

  const tokenId = data?.track.nftData?.tokenId || -1;

  const { data: listingItem, loading } = useListingItemQuery({
    variables: { tokenId },
    fetchPolicy: 'no-cache',
  });

  useEffect(() => {
    const fetchIsOwner = async () => {
      if (!account || !web3 || !data?.track.nftData?.tokenId) {
        return;
      }
      const isTokenOwnerRes = await isTokenOwner(web3, data.track.nftData.tokenId, account);
      setIsOwner(isTokenOwnerRes);
    };
    fetchIsOwner();
  }, [account, web3, data?.track.nftData, isTokenOwner]);

  const isForSale = !!listingItem?.listingItem.pricePerItem ?? false;
  const price = web3?.utils.fromWei(listingItem?.listingItem.pricePerItem.toString() ?? '0', 'ether');

  const topNovaBarProps: TopNavBarProps = {
    leftButton: <BackButton />,
    title: 'NFT Details',
  };

  return (
    <Layout topNavBarProps={topNovaBarProps}>
      <div className="p-3 flex flex-col gap-5">
        <Track trackId={trackId} />
        <Description description={data?.track.description || ''} />
      </div>
      <TrackInfo
        trackTitle={data?.track.title}
        albumTitle={data?.track.album}
        releaseYear={data?.track.releaseYear}
        genres={data?.track.genres}
        copyright={data?.track.copyright}
      />
      <MintingData transactionHash={data?.track.nftData?.transactionHash} ipfsCid={data?.track.nftData?.ipfsCid} />

      {loading || isOwner === undefined || !price ? (
        <div className=" flex justify-center items-center">
          <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-white"></div>
        </div>
      ) : (
        <HandleNFT price={price} isOwner={isOwner} isForSale={isForSale} />
      )}
    </Layout>
  );
}
