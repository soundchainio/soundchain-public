import React, { useEffect } from 'react'
import { Song, useAudioPlayerContext } from 'hooks/useAudioPlayer'
import { useState } from 'react'
import tw from 'tailwind-styled-components'
import Asset from 'components/Asset/Asset'
import { PlaylistTrackPlayerControls } from './PlaylistTrackPlayerControls'
import { Button } from 'components/common/Button'
import { usePlaylistContext } from 'hooks/usePlaylistContext'
import { Divider } from 'components/common'
import { formatDate } from 'components/utils/helpers'

export const ImageCard = () => {
  const [isPlaying, setIsPlaying] = useState(false)

  const { playlistState, isCurrentlyPlaying } = useAudioPlayerContext()
  const {
    isFollowedPlaylist,
    toggleFollowPlaylist,
    likeCount,
    followCount,
    setFollowCount,
    playlist,
    profile,
    playlistTracks,
  } = usePlaylistContext()

  const followState = isFollowedPlaylist ? false : true
  const isFollowedButtonText = isFollowedPlaylist ? 'Unfollow' : 'Follow'
  const isFollowedButtonColor = isFollowedPlaylist ? 'disabled' : 'blue'
  const playlistDate = formatDate({ date: playlist?.createdAt })

  const handleOnPlayClicked = () => {
    if (!playlistTracks) return

    const track = playlistTracks[0]

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
    isCurrentlyPlaying(track.id)
  }

  const handleFollowClick = () => {
    const followAction = isFollowedPlaylist ? -1 : +1

    setFollowCount(followCount => followCount + followAction)
    toggleFollowPlaylist(followState)
  }

  useEffect(() => {
    if (!playlistTracks) return

    const track = playlistTracks[0]

    if (!track) return
    setIsPlaying(isCurrentlyPlaying(track.id))
  }, [isCurrentlyPlaying, setIsPlaying, playlistTracks])

  if (!playlist) return null
  return (
    <Container>
      <InnerContainer>
        <ImageContainer>
          <Asset src={playlist.artworkUrl} objectFit="contain" disableImageWave />
        </ImageContainer>
        <PlaylistTrackPlayerControls
          handleOnPlayClicked={handleOnPlayClicked}
          isPlaying={isPlaying}
          profile={profile}
          playlist={playlist}
        />
      </InnerContainer>

      <Button color={isFollowedButtonColor} text={isFollowedButtonText} onClick={handleFollowClick} buttonType="text" />
      <MetricsContainer>
        <Metric>
          <MetricTitle>{playlist.playlistTracks?.length || 0}</MetricTitle>
          <MetricParagraph>Tracks</MetricParagraph>
        </Metric>
        <Metric>
          <MetricTitle>{followCount}</MetricTitle>
          <MetricParagraph>Followers</MetricParagraph>
        </Metric>
        <Metric>
          <MetricTitle>{likeCount}</MetricTitle>
          <MetricParagraph>Likes</MetricParagraph>
        </Metric>
      </MetricsContainer>

      <Divider />
      <Description>
        <span className="mb-2 text-sm font-medium tracking-wide text-white">DESCRIPTION</span>
        <span>{playlist.description}</span>
      </Description>
      <Divider />

      <Published>
        <span className="font-bold">Published</span>
        <span>{playlistDate}</span>
      </Published>
    </Container>
  )
}

const Container = tw.div`
  flex
  flex-col
  gap-6
  items-center 
  justify-center 
  rounded-xl 
  bg-neutral-800
  p-4
  w-full
  max-w-[350px]
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

const MetricsContainer = tw.div`
  flex
  items-center
  gap-2
`
const Metric = tw.div`
  flex 
  flex-col 
  items-center 
  justify-center 
  bg-neutral-700
  py-2 
  px-6
  rounded-md
`
const MetricTitle = tw.h1`
  text-white
`
const MetricParagraph = tw.p`
  font-sm 
  font-normal 
  text-neutral-400
`

const Description = tw.p`
  text-neutral-400
  text-left
  w-full
  flex
  flex-col
  items-start
`

const Published = tw.div`
  flex
  items-center
  justify-between
  mb-4
  text-neutral-400
  w-full
`
