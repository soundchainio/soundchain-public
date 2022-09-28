import React from 'react'
import Image from 'next/image'
import { useToggleFavoriteMutation, MeQuery, TrackQuery } from 'lib/graphql'
import { Song, useAudioPlayerContext } from 'hooks/useAudioPlayer'
import router from 'next/router'
import { useEffect, useState } from 'react'
import { Pause } from 'icons/Pause'
import { Play } from 'icons/Play'
import { HeartFull } from 'icons/HeartFull'
import { HeartBorder } from 'icons/HeartBorder'
import Link from 'next/link'
import tw from 'tailwind-styled-components'

interface Props {
  me?: MeQuery['me']
  track: TrackQuery['track']
}

export const TrackCard = (props: Props) => {
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
    if (track) {
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
            objectFit="fill"
            alt="art image of the current track "
            className="rounded-xl"
          />
        </ImageContainer>
        <MobilePlayer>
          <div className="flex items-center justify-between">
            <span>
              <button
                className="mb-4 flex h-8 w-8 items-center rounded-full bg-white"
                onClick={handleOnPlayClicked}
                aria-label={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? (
                  <Pause className="m-auto scale-125 text-white" />
                ) : (
                  <Play className="m-auto scale-125 text-white" />
                )}
              </button>
              <TrackTitle>{track.title}</TrackTitle>
              <Link href={`/profiles/${track.artist}` || ''}>
                <a>
                  <ArtistName>{track.artist}</ArtistName>
                </a>
              </Link>
            </span>

            {isFavorite ? (
              <HeartFull onClick={handleSetFavorite} className="mb-1 self-end hover:cursor-pointer" />
            ) : (
              <HeartBorder onClick={handleSetFavorite} className="mb-1 self-end hover:cursor-pointer" />
            )}
          </div>
        </MobilePlayer>
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
  flex w-full 
  items-center 
  justify-center
`

const ImageContainer = tw.div`
  h-[400px]
  w-full
`
const MobilePlayer = tw.div`
  mobile-image-black-bottom-gradient 
  absolute 
  top-0 
  left-0 
  flex 
  h-[400px] 
  w-full 
  flex-col 
  justify-end 
  rounded-xl 
  p-4 
text-white
`
const TrackTitle = tw.h1`
  mb-2 
  text-xl 
  font-bold 
  leading-5
`
const ArtistName = tw.h2`
  text-base 
  font-bold 
  leading-5 
text-[#969899]
`
