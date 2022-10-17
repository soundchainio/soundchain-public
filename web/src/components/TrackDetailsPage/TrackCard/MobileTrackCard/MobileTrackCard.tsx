import React from 'react'
import Image from 'next/image'
import { useToggleFavoriteMutation, MeQuery, TrackQuery } from 'lib/graphql'
import { Song, useAudioPlayerContext } from 'hooks/useAudioPlayer'
import router from 'next/router'
import { useEffect, useState } from 'react'
import tw from 'tailwind-styled-components'
import { MobilePlayer } from './components'

interface Props {
  me?: MeQuery['me']
  track: TrackQuery['track']
}

export const MobileTrackCard = (props: Props) => {
  const [toggleFavorite] = useToggleFavoriteMutation()
  const [isFavorite, setIsFavorite] = useState<boolean | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)

  const { me, track } = props
  const { playlistState, isCurrentlyPlaying } = useAudioPlayerContext()

  const handleSetFavorite = async () => {
    if (me?.profile.id) {
      setIsFavorite(!isFavorite)
      await toggleFavorite({ variables: { trackId: track.id }, refetchQueries: ['FavoriteTracks'] })
    } else {
      router.push('/login')
    }
  }

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
    if (!track.isFavorite) return

    setIsFavorite(track.isFavorite)
  }, [track.isFavorite])

  useEffect(() => {
    setIsPlaying(isCurrentlyPlaying(track.id))
  }, [isCurrentlyPlaying, setIsPlaying, track.id])

  return (
    <Container>
      <InnerContainer>
        <ImageContainer>
          <Image
            src={track.artworkUrl || ''}
            layout="fill"
            alt="art image of the current track "
            className="rounded-xl"
          />
        </ImageContainer>
        <MobilePlayer
          handleOnPlayClicked={handleOnPlayClicked}
          isPlaying={isPlaying}
          handleSetFavorite={handleSetFavorite}
          track={track}
          isFavorite={isFavorite}
        />
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
  items-center 
  justify-center
`

const ImageContainer = tw.div`
  h-[400px]
  w-full
  relative
`
