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
    <div className="mt-4 flex items-center justify-center">
      <div className="flex items-center justify-center rounded-xl bg-[#19191A] p-4">
        <div className="relative flex items-center justify-center">
          <div className="h-[400px] w-[327px]">
            <Image
              src={track.artworkUrl || ''}
              height="100%"
              width="100%"
              layout="fill"
              objectFit="fill"
              alt="art image of the current track "
              className="rounded-xl"
            />
          </div>
          <div className="mobile-image-black-bottom-gradient absolute top-0 left-0 flex h-[400px] w-[327px] flex-col justify-end rounded-xl p-4 text-white">
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
                <h1 className="mb-2 text-xl font-bold leading-5">{track.title}</h1>
                <Link href={`/profiles/${track.artist}` || ''}>
                  <a>
                    <h2 className="text-base font-bold leading-5 text-[#969899]">{track.artist}</h2>
                  </a>
                </Link>
              </span>

              {isFavorite ? (
                <HeartFull onClick={handleSetFavorite} className="hover:cursor-pointer" />
              ) : (
                <HeartBorder onClick={handleSetFavorite} className="hover:cursor-pointer" />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
