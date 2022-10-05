import SEO from 'components/SEO'
import tw from 'tailwind-styled-components'
import { useMe } from 'hooks/useMe'
import { TrackQuery } from 'lib/graphql'
import { DesktopTrackCard } from './components/TrackCard/DesktopTrackCard/DesktopTrackCard'
import { useIsMobile } from 'hooks/useIsMobile'
import {
  PriceCard,
  MobileTrackCard,
  DescriptionCard,
  TrackDetailsCard,
  ListingsCard,
  OwnedEditionListCard,
} from './components'

interface TrackPageProps {
  track: TrackQuery['track']
}

export const TemporaryTrackPage = ({ track }: TrackPageProps) => {
  const me = useMe()
  const isMobile = useIsMobile(639)

  const title = `${track.title} - song by ${track.artist} | SoundChain`
  const description = `Listen to ${track.title} on SoundChain. ${track.artist}. ${track.album || 'Song'}. ${
    track.releaseYear != null ? `${track.releaseYear}.` : ''
  }`

  return (
    <>
      <SEO title={title} description={description} canonicalUrl={`/tracks/${track.id}`} image={track.artworkUrl} />
      <Container>
        {isMobile ? <MobileTrackCard me={me} track={track} /> : <DesktopTrackCard me={me} track={track} />}
        <PriceCard track={track} />
        <DescriptionCard track={track} />
        <TrackDetailsCard track={track} />
        {track.editionSize > 1 && <OwnedEditionListCard track={track} />}
        {track.editionSize > 1 && <ListingsCard track={track} />}
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
