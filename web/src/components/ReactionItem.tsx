import { ReactionEmoji } from 'icons/ReactionEmoji'
import { Reaction, ReactionType } from 'lib/graphql'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { Avatar } from 'components/Avatar'
import { DisplayName } from './DisplayName'

interface FollowItemProps {
  reaction: Reaction
  onClick: () => void
}

export const ReactionItem = ({ reaction: { type, profile }, onClick }: FollowItemProps) => {
  const router = useRouter()
  const onReactionClick = () => {
    onClick()
    router.push(`/profiles/${profile.userHandle}`)
  }

  return (
    <div className="flex flex-row items-center justify-between space-x-2 px-4 py-3" onClick={onReactionClick}>
      <Link href={`/profiles/${profile.userHandle}`} passHref>
        <a className="flex flex-row items-center gap-2 truncate text-sm">
          <Avatar linkToProfile={false} pixels={40} className="flex" profile={profile} />
          <DisplayName
            name={profile.displayName}
            verified={profile.verified}
            teamMember={profile.teamMember}
            badges={profile.badges}
          />
        </a>
      </Link>
      <div className="flex items-center justify-center">
        <ReactionEmoji name={type.toUpperCase() as ReactionType} className="h-4 w-4" />
      </div>
    </div>
  )
}
