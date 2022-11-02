import { TrackDocument, useTrackQuery } from 'lib/graphql'
import SEO from 'components/SEO'
import tw from 'tailwind-styled-components'
import { useMe } from 'hooks/useMe'
import { TrackQuery } from 'lib/graphql'
import { useIsMobile } from 'hooks/useIsMobile'
import { useState } from 'react'
import {
  PriceCard,
  MobileTrackCard,
  DescriptionCard,
  TrackDetailsCard,
  ListingsCard,
  OwnedEditionListCard,
  DesktopTrackCard,
  BidHistory,
} from 'components/pages/TrackDetailsPage'
import { useEffect } from 'react'
import { useRouter } from 'next/router'
import { useTokenOwner } from 'hooks/useTokenOwner'
import { GetServerSideProps } from 'next/types'
import { cacheFor, createApolloClient } from 'lib/apollo'
import { ParsedUrlQuery } from 'querystring'
export interface TrackPageProps {
  track: TrackQuery['track']
}

interface TrackPageParams extends ParsedUrlQuery {
  id: string
}

export const getServerSideProps: GetServerSideProps<TrackPageProps, TrackPageParams> = async context => {
  const trackId = context.params?.id

  if (!trackId) return { notFound: true }

  const apolloClient = createApolloClient(context)

  const { data, error } = await apolloClient.query({
    query: TrackDocument,
    variables: { id: trackId },
    context,
  })

  if (error || data.track.deleted) return { notFound: true }

  return cacheFor(TrackPage, { track: data.track }, context, apolloClient)
}

export default function TrackPage({ track: serverSideTrack }: TrackPageProps) {
  const me = useMe()
  const isMobile = useIsMobile(639)
  const router = useRouter()

  const [track, setTrack] = useState<TrackQuery['track']>(serverSideTrack)

  const title = `${track?.title} - song by ${track?.artist} | SoundChain`
  const description = `Listen to ${track?.title} on SoundChain. ${track?.artist}. ${track?.album || 'Song'}. ${
    track?.releaseYear != null ? `${track?.releaseYear}.` : ''
  }`

  const { isOwner } = useTokenOwner(track?.nftData?.tokenId, track?.nftData?.contract)

  const { data, loading } = useTrackQuery({
    variables: {
      id: router.query.id as string,
    },
    pollInterval: 10000,
  })

  useEffect(() => {
    if (!data) return

    setTrack(data.track)
  }, [data, track])

  useEffect(() => {
    if (!track?.deleted) return

    router.push('/marketplace')
  }, [router, track?.deleted])

  if (loading || !track) return null

  return (
    <>
      <SEO
        title={title}
        description={description}
        canonicalUrl={`/tracks/${track.id}`}
        image={track.artworkUrl}
        type="music.song"
      />
      <Container>
        {isMobile ? (
          <MobileTrackCard me={me} track={track} />
        ) : (
          <DesktopTrackCard me={me} track={track} isLoading={loading} />
        )}
        <PriceCard track={track} />
        <BidHistory track={track} />
        <DescriptionCard track={track} />
        <TrackDetailsCard track={track} />
        {track.editionSize > 1 && (
          <>
            {isOwner ? (
              <>
                <OwnedEditionListCard track={track} />
                <ListingsCard track={track} isOwner={isOwner} />
              </>
            ) : (
              <>
                <ListingsCard track={track} isOwner={isOwner} />
                <OwnedEditionListCard track={track} />
              </>
            )}
          </>
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
