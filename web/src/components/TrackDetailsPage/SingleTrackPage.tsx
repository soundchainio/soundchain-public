import SEO from 'components/SEO'
import { useMe } from 'hooks/useMe'
import { TrackQuery } from 'lib/graphql'
import { PriceCard, MobileTrackCard, DescriptionCard, TrackDetailsCard } from './components'
import tw from 'tailwind-styled-components'
import { DesktopTrackCard } from './components/DesktopTrackCard/DesktopTrackCard'
import styled from 'styled-components'

interface SingleTrackPageProps {
  track: TrackQuery['track']
}

export const SingleTrackPage = ({ track }: SingleTrackPageProps) => {
  const me = useMe()

  const title = `${track.title} - song by ${track.artist} | SoundChain`
  const description = `Listen to ${track.title} on SoundChain. ${track.artist}. ${track.album || 'Song'}. ${
    track.releaseYear != null ? `${track.releaseYear}.` : ''
  }`

  return (
    <>
      <SEO title={title} description={description} canonicalUrl={`/tracks/${track.id}`} image={track.artworkUrl} />
      <Container>
        <MobileTrackCard me={me} track={track} />
        <DesktopTrackCard me={me} track={track} />
        <PriceCard track={track} />
        <DescriptionCard track={track} />
        <TrackDetailsCard track={track} />
      </Container>
    </>
  )
}

const Grid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  grid-template-rows: 1fr;
  justify-items: center;
  grid-gap: 20px;

  @media (min-width: 1024px) {
    grid-template-columns: 320px 1fr;

    div:nth-child(2) {
      grid-row: 1 / span 3;
    }
  }
`

const Container = tw(Grid)`
  m-4
  grid
  
`
