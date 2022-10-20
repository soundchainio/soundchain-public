import { ProfileWithAvatar } from 'components/ProfileWithAvatar'
import { TrackQuery, useProfileLazyQuery } from 'lib/graphql'
import { useEffect } from 'react'
import tw from 'tailwind-styled-components'
import { Divider } from 'components/common'

interface Props {
  track: TrackQuery['track']
}

export const DescriptionCard = (props: Props) => {
  const { track } = props

  const [profile, { data: profileInfo }] = useProfileLazyQuery()

  useEffect(() => {
    if (track.artistProfileId) {
      profile({ variables: { id: track.artistProfileId } })
    }
  }, [track.artistProfileId, profile])

  if (!track || !profileInfo) return null

  return (
    <Container>
      <TitleContainer>
        <Title>Description</Title>
      </TitleContainer>

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
  min-w-[320px] 
  max-w-[350px] 
  rounded-xl 
  bg-[#19191A] 
  p-6 
  w-full
  sm:hidden
`

const TitleContainer = tw.div`
  flex
  items-center 
  justify-between
`

const Title = tw.h3`
  text-xl 
  font-bold 
  text-white
`
const SubTitle = tw.h2`
  mb-4 
  text-lg 
  font-bold 
  leading-4 
  text-[#CCCCCC]
  w-[250px]
`

const FollowContainer = tw.div`
  my-8 
  flex 
  tems-center
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
`
