/* eslint-disable @typescript-eslint/no-non-null-assertion */

import { MultipleTrackPage } from 'components/trackpage/MultipleTrackPage';
import { SingleTrackPage } from 'components/trackpage/SingleTrackPage';
import { cacheFor, createApolloClient } from 'lib/apollo';
import { TrackDocument, TrackQuery } from 'lib/graphql';
import { GetServerSideProps } from 'next';
import { ParsedUrlQuery } from 'querystring';

export interface TrackPageProps {
  track: TrackQuery['track'];
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

  const { data, error } = await apolloClient.query({
    query: TrackDocument,
    variables: { id: trackId },
    context,
  });

  if (error || data.track.deleted) {
    return { notFound: true };
  }

  return cacheFor(TrackPage, { track: data.track }, context, apolloClient);
};

export default function TrackPage({ track }: TrackPageProps) {
  if (track.editionSize > 1) {
    return <MultipleTrackPage track={track} />;
  }
  return <SingleTrackPage track={track} />;
}
