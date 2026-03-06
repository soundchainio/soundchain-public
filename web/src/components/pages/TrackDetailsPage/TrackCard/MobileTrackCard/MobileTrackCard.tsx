import React from 'react'
import Image from 'next/image'
import { MeQuery, TrackQuery } from 'lib/graphql'
import { Song, useAudioPlayerContext } from 'hooks/useAudioPlayer'
import { useEffect, useState } from 'react'
import tw from 'tailwind-styled-components'
import { MobilePlayer } from './components'
import Asset from 'components/Asset/Asset'

interface Props {
  me?: MeQuery['me']
  track: TrackQuery['track']
}

export const MobileTrackCard = (props: Props) => {
  const [isPlaying, setIsPlaying] = useState(false)

  const { track } = props
  const { playlistState, isCurrentlyPlaying } = useAudioPlayerContext()

  const handleOnPlayClicked = () => {
    if (!track) return

    const list = [
      {
        trackId: track.id,
        src: track.playbackUrl,
        art: track.artworkUrl,
        title: track.title,
        artist: track.artist,
        isFavorite: track.isFavorite,
      } as Song,
    ]
    playlistState(list, 0)
  }

  useEffect(() => {
    setIsPlaying(isCurrentlyPlaying(track.id))
  }, [isCurrentlyPlaying, setIsPlaying, track.id])

  return (
    <Container>
      <InnerContainer>
        <ImageContainer>
          <Asset src={track.artworkUrl} objectFit="contain" disableImageWave />
        </ImageContainer>
        <MobilePlayer handleOnPlayClicked={handleOnPlayClicked} isPlaying={isPlaying} track={track} />
      </InnerContainer>
    </Container>
  )
}

const Container = tw.div`
  flex 
  w-full 
  min-w-[320px] 
  max-w-[350px] 
  items-center 
  justify-center 
  rounded-xl 
  bg-[#19191A] 
  p-4
  sm:hidden
`
const InnerContainer = tw.div`
  relative 
  flex 
  w-full 
  h-full
  items-center 
  justify-center
  bg-black
  rounded-lg
`

const ImageContainer = tw.div`
  h-[400px]
  w-full
  relative
`
