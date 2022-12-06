import Asset from 'components/Asset/Asset'
import { Button } from 'components/common/Button'
import { EllipsisButton } from 'components/common/EllipsisButton'
import { Pause } from 'icons/Pause'
import { Play } from 'icons/Play'
import tw from 'tailwind-styled-components'
import { TrackMenu } from './TrackMenu'
import { useState } from 'react'
import { usePlaylistContext } from 'hooks/usePlaylistContext'
import { Song } from 'components/AudioPlayer'
import { useAudioPlayerContext } from 'hooks/useAudioPlayer'

export const PlaylistTracks = () => {
  const { playlistTracks } = usePlaylistContext()

  const [showTrackMenu, setShowTrackMenu] = useState(false)
  const { playlistState, isPlaying } = useAudioPlayerContext()

  const handleOnPlayClicked = (index: number) => {
    if (!playlistTracks || playlistTracks.length <= 0) return

    const list = playlistTracks.map(
      track =>
        ({
          trackId: track.id,
          src: track.playbackUrl,
          art: track.artworkUrl,
          title: track.title,
          artist: track.artist,
          isFavorite: track.isFavorite,
        } as Song),
    )
    playlistState(list, index)
  }

  if (!playlistTracks || playlistTracks.length < 1) return null

  return (
    <Card>
      {playlistTracks.map((track, index) => (
        <Container key={index}>
          <TrackContainer>
            <TrackImage>
              <Asset src={track.artworkUrl} sizes="5.625rem" disableImageWave imageClassname="rounded-xl" />
              <PlayButton onClick={() => handleOnPlayClicked(index)} aria-label={isPlaying ? 'Pause' : 'Play'}>
                {isPlaying ? (
                  <Pause className="ml-[1px] scale-125 text-white" />
                ) : (
                  <Play className="ml-[1px] scale-125 text-white" />
                )}
              </PlayButton>
            </TrackImage>

            <Details>
              <Title>{track.title}</Title>
              <ArtistName>{track.artist}</ArtistName>
            </Details>

            <EllipsisButton setShowTrackMenu={setShowTrackMenu} showTrackMenu={showTrackMenu}>
              <TrackMenu
                track={track}
                isPlaying={isPlaying}
                handleOnPlayClicked={handleOnPlayClicked}
                setShowTrackMenu={setShowTrackMenu}
              />
            </EllipsisButton>
          </TrackContainer>

          <Button
            color="green"
            buttonType="currency"
            currency={{ type: track.price.currency, value: track.price.value }}
          />
        </Container>
      ))}
    </Card>
  )
}

const Card = tw.section`
  items-center 
  justify-center 
  rounded-xl 
  bg-neutral-800
  p-4
  w-full
  max-w-[350px]
`
const Container = tw.div`
  flex
  flex-col
  items-start
  gap-4
`
const TrackContainer = tw.div`
  flex
  items-center
  gap-3
  w-full
  my-2
`

const TrackImage = tw.div`
  relative
  h-[75px] 
  w-[130px]
`
const PlayButton = tw.button`
  flex 
  h-7 
  w-7 
  items-center 
  justify-center
  rounded-full 
  bg-white
  absolute
  top-1/2 
  left-1/2 
  transform 
  -translate-x-1/2 
  -translate-y-1/2
`

const Details = tw.div`
  flex
  flex-col
  items-start
  w-full
`
const Title = tw.h2`
  text-white
  text-lg
  text-ellipsis
  overflow-hidden
  line-clamp-1
  max-w-[150px]
`
const ArtistName = tw.h3`
  text-neutral-400
  text-md
  text-ellipsis
  overflow-hidden
  line-clamp-1
  max-w-[150px]
`
