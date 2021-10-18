import { BottomSheet } from 'components/BottomSheet';
import { BackButton } from 'components/Buttons/BackButton';
import { Description } from 'components/details-NFT/Description';
import { HandleNFT } from 'components/details-NFT/HandleNFT';
import { MintingData } from 'components/details-NFT/MintingData';
import { TrackInfo } from 'components/details-NFT/TrackInfo';
import { Layout } from 'components/Layout';
import { TopNavBarProps } from 'components/TopNavBar';
import { Track } from 'components/Track';
import { useMagicContext } from 'hooks/useMagicContext';
import { cacheFor, createApolloClient } from 'lib/apollo';
import { isTokenOwner } from 'lib/blockchain';
import { TrackDocument, useIsForSaleLazyQuery, useTrackQuery } from 'lib/graphql';
import { GetServerSideProps } from 'next';
import { ParsedUrlQuery } from 'querystring';
import { useEffect, useState } from 'react';

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

  return cacheFor(TrackPage, { trackId }, context, apolloClient);
};

export default function TrackPage({ trackId }: TrackPageProps) {
  const { account, web3 } = useMagicContext();
  const { data } = useTrackQuery({ variables: { id: trackId } });

  const [isOwner, setIsOwner] = useState(false);

  const tokenId = data?.track.nftData?.tokenId || -1;

  const [isForSale, { data: isForSaleRes }] = useIsForSaleLazyQuery({
    variables: { tokenId },
  });

  const isForSaleResponse = isForSaleRes?.isForSale.is || false;

  useEffect(() => {
    const fetchIsOwner = async () => {
      if (!account || !web3 || !data?.track.nftData?.tokenId) {
        return;
      }
      const isTokenOwnerRes = await isTokenOwner(web3, data.track.nftData.tokenId, account);
      setIsOwner(isTokenOwnerRes);
    };
    fetchIsOwner();
  }, [account, web3, data?.track.nftData]);

  useEffect(() => {
    isForSale();
  }, [isForSale]);

  const topNovaBarProps: TopNavBarProps = {
    leftButton: <BackButton />,
    title: 'NFT Details',
  };

  return (
    <Layout topNavBarProps={topNovaBarProps}>
      <div className="m-4">
        <Track trackId={trackId} />
      </div>
      <Description description={data?.track.description || ''} />
      <TrackInfo trackTitle={data?.track.title || undefined} albumTitle={undefined} releaseYear={undefined} />
      <BottomSheet>
        <MintingData />
        <HandleNFT isOwner={isOwner} isForSale={isForSaleResponse} />
      </BottomSheet>
    </Layout>
  );
}
