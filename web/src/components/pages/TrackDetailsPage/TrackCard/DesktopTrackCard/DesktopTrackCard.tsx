import React, { useEffect, useState } from 'react'

import Asset from 'components/Asset/Asset'
import { Divider } from 'components/common'
import { FavoriteTrack } from 'components/common/Buttons/FavoriteTrack/FavoriteTrack'
import { ProfileWithAvatar } from 'components/ProfileWithAvatar'
import { TrackShareButton } from 'components/TrackShareButton'
import { WaveformWithComments } from 'components/WaveformWithComments'
import { Song, useAudioPlayerContext } from 'hooks/useAudioPlayer'
import { useTrackComments } from 'hooks/useTrackComments'
import { MeQuery, TrackQuery, useProfileLazyQuery } from 'lib/graphql'
import Link from 'next/link'
import { LinkItUrl } from 'react-linkify-it'
import { Tooltip } from 'react-tooltip'
import tw from 'tailwind-styled-components'

import { MobilePlayer } from '../MobileTrackCard/components'

interface Props {
  me?: MeQuery['me']
  track: TrackQuery['track']
  isLoading: boolean
}

export const DesktopTrackCard = (props: Props) => {
  const [isPlaying, setIsPlaying] = useState(false)

  const { track } = props

  const [profile, { data: profileInfo }] = useProfileLazyQuery()
  const { playlistState, isCurrentlyPlaying, duration, progress, setProgressStateFromSlider, togglePlay } = useAudioPlayerContext()

  // Track comments for waveform
  const { comments, addComment, likeComment } = useTrackComments({ trackId: track?.id || '' })

  // Convert progress percentage to current time in seconds
  const currentTime = (progress / 100) * duration

  // Seek function - converts time in seconds to percentage
  const handleSeek = (timeInSeconds: number) => {
    if (duration > 0) {
      const percentage = (timeInSeconds / duration) * 100
      setProgressStateFromSlider(percentage)
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
    if (track.artistProfileId) {
      profile({ variables: { id: track.artistProfileId } })
    }
  }, [track.artistProfileId, profile])

  useEffect(() => {
    setIsPlaying(isCurrentlyPlaying(track.id))
  }, [isCurrentlyPlaying, setIsPlaying, track.id])

  if (!track || !profileInfo) return null

  return (
    <Container>
      <div className="flex items-start xl:flex-col">
        <ArtistContainer>
          <ImageContainer>
            <Asset src={track.artworkUrl} objectFit="contain" disableImageWave />
            <MobilePlayer
              handleOnPlayClicked={handleOnPlayClicked}
              isPlaying={isPlaying}
              track={track}
              classNames="h-[250px] xl:hidden"
              hideArtistName
              hideLikeButton
              hideTrackName
              playButtonStyle="scale-150 ml-2 mb-2"
            />
          </ImageContainer>

          <ArtistNameContainer>
            <span>
              <Tooltip id="track-title" content={track.title} />
              <a data-tooltip-id="track-title">
                <TrackTitle>{track.title}</TrackTitle>
              </a>

              <Link href={`/profiles/${track.artist}` || ''} passHref>
                <ArtistName>{track.artist}</ArtistName>
              </Link>
            </span>

            <div className="mr-3 flex items-center gap-2 md:mr-0">
              <TrackShareButton trackId={track.id} artist={track.artist} title={track.title} height={30} width={30} />
              <FavoriteTrack />
            </div>
          </ArtistNameContainer>

          {/* SoundCloud-style waveform with timestamped comments */}
          {track.playbackUrl && duration > 0 && (
            <div className="mt-4 px-2">
              <WaveformWithComments
                trackId={track.id}
                audioUrl={track.playbackUrl}
                duration={duration}
                comments={comments}
                onAddComment={addComment}
                onLikeComment={likeComment}
                isPlaying={isPlaying}
                currentTime={currentTime}
                onSeek={handleSeek}
                onPlayPause={togglePlay}
              />
            </div>
          )}
        </ArtistContainer>

        <DescriptionContainer>
          <ProfileWithAvatar profile={profileInfo.profile} className="ml-2" />

          <FollowContainer>
            <Follow>
              <FollowTitle>{profileInfo.profile.followingCount}</FollowTitle>
              <FollowParagraph>Following</FollowParagraph>
            </Follow>
            <Follow>
              <FollowTitle>{profileInfo.profile.followerCount}</FollowTitle>
              <FollowParagraph>Followers</FollowParagraph>
            </Follow>
          </FollowContainer>
        </DescriptionContainer>

        <Divider />
      </div>

      <div className="mx-2 flex w-full items-start  xl:flex-col">
        <div className="my-6 w-full">
          <SubTitle>Description</SubTitle>
          <LinkItUrl>
            <Paragraph>{track.description || 'No track description.'}</Paragraph>
          </LinkItUrl>
        </div>
        <Divider classnames="hidden xl:block" />
        <div className="my-6 w-full">
          <SubTitle>Utility</SubTitle>
          <LinkItUrl>
            <Paragraph>{track.utilityInfo || 'No utility information.'}</Paragraph>
          </LinkItUrl>
        </div>
      </div>
    </Container>
  )
}

const Container = tw.div`
  flex
  flex-col
  w-full
  rounded-xl 
  bg-[#19191A] 
  p-4
  max-w-[800px]

  xl:flex-col
  xl:row-span-4
  xl:self-start
`

const ArtistContainer = tw.div`
  flex
  flex-col
  w-full
  mb-6
`

const ImageContainer = tw.div`
  mb-4
  h-[250px]
  w-[440px]
  relative
  self-center
  bg-black
  rounded-lg
  
  sm:w-[320px]
  sm:mr-6

  xl:mr-0
`

const DescriptionContainer = tw.div`
  w-full
`

const ArtistNameContainer = tw.span`
  flex 
  items-center 
  justify-between
  mr-2
  ml-2

  md:mr-6
  xl:mr-0
`
const TrackTitle = tw.h1`
  font-bold 
  text-base 
  leading-6
  text-white
  max-w-[200px]
  truncate
`
const ArtistName = tw.h2`
  not-italic 
  font-bold 
  text-sm 
  leading-5
  text-[#969899]
  max-w-[200px]
  truncate
`

const SubTitle = tw.h2`
  mb-4 
  text-lg 
  font-bold 
  leading-4 
  text-[#CCCCCC]
`

const FollowContainer = tw.div`
  my-8 
  flex 
  items-center
  gap-2
`
const Follow = tw.div`
  flex 
  w-[50%] 
  flex-col 
  items-center 
  justify-center 
  bg-[#202020] 
  py-1.5 
  px-4
`

const FollowTitle = tw.h1`
  text-white
`
const FollowParagraph = tw.p`
  font-sm 
  font-normal 
  text-[#808080]
`

const Paragraph = tw.p`
  text-md 
  font-normal 
  leading-4 
  text-[#7D7F80]
  break-words
  w-[250px]

  [&>a]:text-indigo-200
  [&>a]:hover:text-indigo-100
`
