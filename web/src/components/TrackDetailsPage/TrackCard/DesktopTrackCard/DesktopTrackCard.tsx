import React from 'react'
import Image from 'next/image'
import { MeQuery, TrackQuery, useProfileLazyQuery } from 'lib/graphql'
import { useEffect, useState } from 'react'
import tw from 'tailwind-styled-components'
import { Divider } from 'components/common'
import { ProfileWithAvatar } from 'components/ProfileWithAvatar'
import Link from 'next/link'
import { TrackShareButton } from 'components/TrackShareButton'
import { Song, useAudioPlayerContext } from 'hooks/useAudioPlayer'
import { MobilePlayer } from '../MobileTrackCard/components'
import { FavoriteTrack } from 'components/Buttons/FavoriteTrack/FavoriteTrack'
interface Props {
  me?: MeQuery['me']
  track: TrackQuery['track']
  isLoading: boolean
}

export const DesktopTrackCard = (props: Props) => {
  const [isPlaying, setIsPlaying] = useState(false)

  const { track } = props

  const [profile, { data: profileInfo }] = useProfileLazyQuery()
  const { playlistState, isCurrentlyPlaying } = useAudioPlayerContext()

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
      <ArtistContainer>
        <ImageContainer>
          <Image
            src={track.artworkUrl || ''}
            layout="fill"
            objectFit="contain"
            alt="art image of the current track "
            className="rounded-xl"
          />
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
            <TrackTitle>{track.title}</TrackTitle>
            <Link href={`/profiles/${track.artist}` || ''}>
              <a>
                <ArtistName>{track.artist}</ArtistName>
              </a>
            </Link>
          </span>

          <div className="flex items-center gap-2">
            <TrackShareButton trackId={track.id} artist={track.artist} title={track.title} height={30} width={30} />
            <FavoriteTrack />
          </div>
        </ArtistNameContainer>
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

        <Divider />

        <div className="my-6">
          <SubTitle>Description</SubTitle>
          <Paragraph>{track.description || 'No track description.'}</Paragraph>
        </div>

        <Divider />

        <div className="my-6">
          <SubTitle>Utility</SubTitle>
          <Paragraph>{track.utilityInfo || 'No utility information.'}</Paragraph>
        </div>
      </DescriptionContainer>
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

  md:flex-row
  md:items-start
  md:justify-between

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
  
  md:w-[320px]
  md:mr-6

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
`
const ArtistName = tw.h2`
  not-italic 
  font-bold 
  text-sm 
  leading-5
  text-[#969899]
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
`
