import { BottomSheet } from 'components/BottomSheet';
import { Button } from 'components/Button';
import { BackButton } from 'components/Buttons/BackButton';
import { SellNFT } from 'components/details-NFT/SellNFT';
import { Layout } from 'components/Layout';
import { TopNavBarProps } from 'components/TopNavBar';
import { Track } from 'components/Track';
import { useModalDispatch } from 'contexts/providers/modal';
import { useMagicContext } from 'hooks/useMagicContext';
import { useMe } from 'hooks/useMe';
import { cacheFor, createApolloClient } from 'lib/apollo';
import { listItem } from 'lib/blockchain';
import { TrackDocument, useTrackQuery } from 'lib/graphql';
import { GetServerSideProps } from 'next';
import { useRouter } from 'next/router';
import { ParsedUrlQuery } from 'querystring';
import { useState } from 'react';

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

  return cacheFor(SellPage, { trackId }, context, apolloClient);
};

export default function SellPage({ trackId }: TrackPageProps) {
  const router = useRouter();
  const me = useMe();
  const { data } = useTrackQuery({ variables: { id: trackId } });
  const { account, web3 } = useMagicContext();
  const isApproved = me?.isApprovedOnMarketplace;
  const { dispatchShowApproveModal } = useModalDispatch();

  const [price, setPrice] = useState(0);
  const [quantity, setQuantity] = useState(0);

  const handleSell = async () => {
    dispatchShowApproveModal(true);
    if (isApproved) {
      await listItem(web3!, data?.track?.nftData?.tokenId!, quantity, account!, price);
    }
    me ? dispatchShowApproveModal(true) : router.push('/login');
  };

  const topNovaBarProps: TopNavBarProps = {
    leftButton: <BackButton />,
    title: 'List for Sale',
  };

  return (
    <Layout topNavBarProps={topNovaBarProps}>
      <div className="m-4">
        <Track trackId={trackId} />
      </div>
      <SellNFT onSetPrice={v => setPrice(v)} onSetQuantity={v => setQuantity(v)} />
      <BottomSheet>
        <div className="flex justify-center pb-3">
          <Button variant="sell-nft" onClick={handleSell}>
            <div className="px-4">SELL NFT</div>
          </Button>
        </div>
      </BottomSheet>
    </Layout>
  );
}
