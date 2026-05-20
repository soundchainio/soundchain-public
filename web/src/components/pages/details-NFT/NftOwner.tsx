import { ProfileWithAvatar } from 'components/ProfileWithAvatar'
import { Profile } from 'lib/graphql'
import { useProfileLazyById as useProfileLazyQuery } from 'hooks/useProfileByHandleDirect'  // Phase 7e — Vercel-direct
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
