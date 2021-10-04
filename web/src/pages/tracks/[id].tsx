import { BottomSheet } from 'components/BottomSheet';
import { BackButton } from 'components/Buttons/BackButton';
import { Artist } from 'components/details-NFT/Artist';
import { Description } from 'components/details-NFT/Description';
import { HandleNFT } from 'components/details-NFT/HandleNFT';
import { TrackInfo } from 'components/details-NFT/TrackInfo';
import { Layout } from 'components/Layout';
import { TopNavBarProps } from 'components/TopNavBar';
import { Track } from 'components/Track';
import { useMe } from 'hooks/useMe';
import { ParsedUrlQuery } from 'querystring';

export interface TrackPageProps {
  trackId: string;
}

interface TrackPageParams extends ParsedUrlQuery {
  id: string;
}

// export const getServerSideProps: GetServerSideProps<TrackPageProps, TrackPageParams> = async context => {
//   const trackId = context.params?.id;

//   if (!trackId) {
//     return { notFound: true };
//   }

//   const apolloClient = createApolloClient(context);

//   const { error } = await apolloClient.query({
//     query: TrackDocument,
//     variables: { id: trackId },
//     context,
//   });

//   if (error) {
//     return { notFound: true };
//   }

//   return cacheFor(TrackPage, { trackId }, context, apolloClient);
// };

export default function TrackPage({ trackId }: TrackPageProps) {
  const me = useMe();

  const topNovaBarProps: TopNavBarProps = {
    leftButton: <BackButton />,
    title: "NFT Details",
  };

  return (
    <Layout topNavBarProps={topNovaBarProps}>
      <div className="m-4">
        <Track trackId={trackId} />
      </div>
      <Description description={'example of description'} />
      <Artist artistId={'artistId'} />
      <TrackInfo trackTitle={'Track title'} albumTitle={'Album title'} releaseYear={2000} />
      <BottomSheet>
        <HandleNFT />
      </BottomSheet>
    </Layout>
  );
}
