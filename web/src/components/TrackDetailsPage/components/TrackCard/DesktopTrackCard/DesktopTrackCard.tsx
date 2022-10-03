import React from 'react'
import Image from 'next/image'
import { useToggleFavoriteMutation, MeQuery, TrackQuery, useProfileLazyQuery } from 'lib/graphql'
import router from 'next/router'
import { useEffect, useState } from 'react'
import tw from 'tailwind-styled-components'
import { Divider } from 'components/common'
import { ProfileWithAvatar } from 'components/ProfileWithAvatar'
import Link from 'next/link'
import { AiOutlineHeart, AiFillHeart } from 'react-icons/ai'
import { TrackShareButton } from 'components/TrackShareButton'
import { Song, useAudioPlayerContext } from 'hooks/useAudioPlayer'
import { MobilePlayer } from '../MobileTrackCard/components'
interface Props {
  me?: MeQuery['me']
  track: TrackQuery['track']
}

export const DesktopTrackCard = (props: Props) => {
  const [toggleFavorite] = useToggleFavoriteMutation()
  const [isFavorite, setIsFavorite] = useState<boolean | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)

  const { me, track } = props

  const [profile, { data: profileInfo }] = useProfileLazyQuery()
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
            alt="art image of the current track "
            className="rounded-xl"
          />
          <MobilePlayer
            handleOnPlayClicked={handleOnPlayClicked}
            isPlaying={isPlaying}
            handleSetFavorite={handleSetFavorite}
            track={track}
            isFavorite={isFavorite}
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
            {isFavorite ? (
              <AiFillHeart
                onClick={handleSetFavorite}
                className="mb-1 self-start opacity-90 hover:cursor-pointer"
                color="white"
                size={35}
              />
            ) : (
              <AiOutlineHeart
                onClick={handleSetFavorite}
                className="mb-1 self-start hover:cursor-pointer"
                color="#505050"
                stroke="green"
                size={35}
              />
            )}
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

  md:flex-row
  md:items-start
  md:justify-between

  xl:flex-col
  xl:row-span-2
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
  w-[380px]
  relative
  self-center

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
