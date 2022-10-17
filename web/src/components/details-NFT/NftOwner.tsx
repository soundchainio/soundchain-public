import { ProfileWithAvatar } from 'components/ProfileWithAvatar'
import { Profile, useProfileLazyQuery } from 'lib/graphql'
import { useEffect } from 'react'

interface NftOwnerProps {
  profileId: string
  className?: string
}

export const NftOwner = ({ profileId, className }: NftOwnerProps) => {
  const [userQueryProfile, { data: result }] = useProfileLazyQuery()

  useEffect(() => {
    if (profileId) {
      userQueryProfile({ variables: { id: profileId } })
    }
  }, [profileId, userQueryProfile])

  return <ProfileWithAvatar profile={result?.profile as Partial<Profile>} avatarSize={25} className={className} />
}
