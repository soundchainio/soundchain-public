import React from 'react'
import Image from 'next/image'
import { useToggleFavoriteMutation, MeQuery, TrackQuery, useProfileLazyQuery } from 'lib/graphql'
import router from 'next/router'
import { useEffect, useState } from 'react'
import tw from 'tailwind-styled-components'
import { Divider } from 'components/common'
import { ProfileWithAvatar } from 'components/ProfileWithAvatar'
import { HeartBorder } from 'icons/HeartBorder'
import { HeartFull } from 'icons/HeartFull'
import Link from 'next/link'

interface Props {
  me?: MeQuery['me']
  track: TrackQuery['track']
}

export const DesktopTrackCard = (props: Props) => {
  const [toggleFavorite] = useToggleFavoriteMutation()
  const [isFavorite, setIsFavorite] = useState<boolean | null>(null)

  const { me, track } = props

  const [profile, { data: profileInfo }] = useProfileLazyQuery()

  const handleSetFavorite = async () => {
    if (me?.profile.id) {
      setIsFavorite(!isFavorite)
      await toggleFavorite({ variables: { trackId: track.id }, refetchQueries: ['FavoriteTracks'] })
    } else {
      router.push('/login')
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

  if (!track || !profileInfo) return null

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
      </InnerContainer>

      <span className="my-6 flex items-center justify-between">
        <span>
          <TrackTitle>{track.title}</TrackTitle>
          <Link href={`/profiles/${track.artist}` || ''}>
            <a>
              <ArtistName>{track.artist}</ArtistName>
            </a>
          </Link>
        </span>

        {isFavorite ? (
          <HeartFull onClick={handleSetFavorite} className="mb-1 hover:cursor-pointer" />
        ) : (
          <HeartBorder onClick={handleSetFavorite} className="mb-1 hover:cursor-pointer" />
        )}
      </span>

      <Divider />

      <ProfileWithAvatar profile={profileInfo.profile} className="my-6" />

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
    </Container>
  )
}

const Container = tw.div`
  hidden
  w-full 
  min-w-[320px] 
  max-w-[350px] 
  items-center 
  justify-center 
  rounded-xl 
  bg-[#19191A] 
  p-4
  sm:block
`
const InnerContainer = tw.div`
  relative 
  flex 
  w-full 
  items-center 
  justify-center
  mb-6
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

const ImageContainer = tw.div`
  h-[400px]
  w-full
  sm:max-h-[272px]
  sm:max-w-[272px]
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
