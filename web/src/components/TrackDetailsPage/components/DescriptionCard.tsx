import { ProfileWithAvatar } from 'components/ProfileWithAvatar'
import { TrackQuery, useProfileLazyQuery } from 'lib/graphql'
import { MdKeyboardArrowUp } from 'react-icons/md'
import { useEffect } from 'react'

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
    <div className="min-w-[320px] max-w-[350px] rounded-xl bg-[#19191A] p-6 sm:hidden">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold text-white">Description</h3>
        <MdKeyboardArrowUp size={45} color="white" />
      </div>

      <ProfileWithAvatar profile={profileInfo.profile} className="my-6" />

      <div className="my-8 flex items-center gap-2">
        <div className="flex w-[50%] flex-col items-center justify-center bg-[#202020] py-1.5 px-4">
          <h1 className="text-white">{profileInfo.profile.followingCount}</h1>
          <p className="font-sm font-normal text-[#808080]">Following</p>
        </div>
        <div className="flex w-[50%] flex-col items-center justify-center bg-[#202020] py-1.5 px-4">
          <h1 className="text-white">{profileInfo.profile.followerCount}</h1>
          <p className="font-sm font-normal text-[#808080]">Followers</p>
        </div>
      </div>

      <div className="h-[2px] w-full bg-[#323333]" />

      <div className="my-6">
        <h3 className="mb-4 text-lg font-bold leading-4 text-[#CCCCCC]">Description</h3>
        <p className="text-md font-normal leading-4 text-[#7D7F80]">{track.description || 'No track description.'}</p>
      </div>

      <div className="h-[2px] w-full bg-[#323333]" />

      <div className="my-6">
        <h3 className="mb-4 text-lg font-bold leading-4 text-[#CCCCCC]">Utility</h3>
        <p className="text-md font-normal leading-4 text-[#7D7F80]">{track.utilityInfo || 'No utility information.'}</p>
      </div>
    </div>
  )
}
