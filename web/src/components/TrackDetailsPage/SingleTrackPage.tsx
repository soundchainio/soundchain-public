import SEO from 'components/SEO'
import { useMe } from 'hooks/useMe'
import { TrackQuery } from 'lib/graphql'
import { PriceCard, MobileTrackCard, DescriptionCard, TrackDetailsCard } from './components'
import tw from 'tailwind-styled-components'
import { DesktopTrackCard } from './components/DesktopTrackCard/DesktopTrackCard'
import { useIsMobile } from 'hooks/useIsMobile'
interface SingleTrackPageProps {
  track: TrackQuery['track']
}

export const SingleTrackPage = ({ track }: SingleTrackPageProps) => {
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
      </Container>
    </>
  )
}

const Container = tw.div`
  m-4
  grid 
  justify-center
  grid-col-1
  grid-rows-1
  items-center
  gap-6
  content-center

  md:grid-cols-2
`
