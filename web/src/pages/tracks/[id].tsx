import { TemporaryTrackPage } from 'components/TrackDetailsPage/TrackPage'
import { cacheFor, createApolloClient } from 'lib/apollo'
import { TrackDocument, TrackQuery } from 'lib/graphql'
import { GetServerSideProps } from 'next'
import { ParsedUrlQuery } from 'querystring'
import { MultipleTrackPage } from 'components/TrackDetailsPage/Multiple'
import { SingleTrackPage } from 'components/TrackDetailsPage/SingleTrackPage'
export interface TrackPageProps {
  track: TrackQuery['track']
}

interface TrackPageParams extends ParsedUrlQuery {
  id: string
}

export const getServerSideProps: GetServerSideProps<TrackPageProps, TrackPageParams> = async context => {
  const trackId = context.params?.id

  if (!trackId) {
    return { notFound: true }
  }

  const apolloClient = createApolloClient(context)

  const { data, error } = await apolloClient.query({
    query: TrackDocument,
    variables: { id: trackId },
    context,
  })

  if (error || data.track.deleted) {
    return { notFound: true }
  }

  return cacheFor(TrackPage, { track: data.track }, context, apolloClient)
}

export default function TrackPage({ track }: TrackPageProps) {
  // if (track.editionSize > 1) {
  //   return <MultipleTrackPage track={track} />
  // }
  // return <SingleTrackPage track={track} />

  return <TemporaryTrackPage track={track} />
}
