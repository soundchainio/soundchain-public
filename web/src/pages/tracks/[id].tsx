import { cacheFor, createApolloClient } from 'lib/apollo'
import { TrackDocument } from 'lib/graphql'
import { GetServerSideProps } from 'next'
import { ParsedUrlQuery } from 'querystring'
import SEO from 'components/SEO'
import tw from 'tailwind-styled-components'
import { useMe } from 'hooks/useMe'
import { TrackQuery } from 'lib/graphql'
import { useIsMobile } from 'hooks/useIsMobile'
import {
  PriceCard,
  MobileTrackCard,
  DescriptionCard,
  TrackDetailsCard,
  ListingsCard,
  OwnedEditionListCard,
  DesktopTrackCard,
} from 'components/TrackDetailsPage'
import { useState } from 'react'
export interface TrackPageProps {
  track: TrackQuery['track']
}

export default function TrackPage({ track }: TrackPageProps) {
  const me = useMe()
  const isMobile = useIsMobile(639)

  const title = `${track.title} - song by ${track.artist} | SoundChain`
  const description = `Listen to ${track.title} on SoundChain. ${track.artist}. ${track.album || 'Song'}. ${
    track.releaseYear != null ? `${track.releaseYear}.` : ''
  }`

  const [shouldRefresh, setShouldRefresh] = useState(false)

  return (
    <>
      <SEO title={title} description={description} canonicalUrl={`/tracks/${track.id}`} image={track.artworkUrl} />
      <Container>
        {isMobile ? <MobileTrackCard me={me} track={track} /> : <DesktopTrackCard me={me} track={track} />}
        <PriceCard track={track} />
        <DescriptionCard track={track} />
        <TrackDetailsCard track={track} />
        {track.editionSize > 1 && (
          <OwnedEditionListCard track={track} shouldRefresh={shouldRefresh} setShouldRefresh={setShouldRefresh} />
        )}
        {track.editionSize > 1 && (
          <ListingsCard track={track} shouldRefresh={shouldRefresh} setShouldRefresh={setShouldRefresh} />
        )}
      </Container>
    </>
  )
}

const Container = tw.div`
  m-4
  grid 
  justify-center
  grid-col-1
  items-center
  gap-6
  content-center

  xl:grid-cols-[350px_800px]
  xl:items-start
`

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
