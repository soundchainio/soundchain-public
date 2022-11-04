import { Profile } from 'lib/graphql'
import Link from 'next/link'
import { Avatar } from 'components/Avatar'
import { DisplayName } from './DisplayName'

interface FollowItemProps {
  profile: Profile
}

export const FollowItem = ({ profile }: FollowItemProps) => {
  return (
    <Link href={`/profiles/${profile.userHandle}`} passHref>
      <a className="flex flex-row items-center space-x-2 text-sm">
        <Avatar linkToProfile={false} pixels={40} className="flex" profile={profile} />
        <DisplayName
          name={profile.displayName}
          verified={profile.verified}
          teamMember={profile.teamMember}
          badges={profile.badges}
        />
      </a>
    </Link>
  )
}
