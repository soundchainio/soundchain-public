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
import { TrackDocument, useTrackQuery } from 'lib/graphql';
import { GetServerSideProps } from 'next';
import { ParsedUrlQuery } from 'querystring';

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

  const price = 10;
  const parsedBalance = parseInt(balance || '0');

  const handleBuy = async () => {
    if (!web3 || !data?.track.nftData?.tokenId || !data?.track.nftData?.minter || !account) {
      return;
    }
    await buyItem(web3, data?.track.nftData.tokenId, account, data?.track.nftData.minter);
  };

  const topNovaBarProps: TopNavBarProps = {
    leftButton: <BackButton />,
    title: 'Confirm Purchase',
  };

  return (
    <Layout topNavBarProps={topNovaBarProps}>
      <div className="m-4">
        <Track trackId={trackId} />
      </div>
      <BuyNFT price={price} balance={balance || '0'} />
      <BottomSheet>
        <div className="flex justify-center pb-3">
          <Button variant="buy-nft" onClick={handleBuy} disabled={parsedBalance < price}>
            <div className="px-4">BUY NFT</div>
          </Button>
        </div>
      </BottomSheet>
    </Layout>
  );
}
