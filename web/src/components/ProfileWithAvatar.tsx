import classNames from 'classnames'
import { Profile } from 'lib/graphql'
import NextLink from 'next/link'
import { Avatar } from 'components/Avatar'
import { DisplayName } from './DisplayName'

interface Props {
  profile: Partial<Profile>
  className?: string
  avatarSize?: number
  showAvatar?: boolean
  shouldRedirect?: boolean
}

export const ProfileWithAvatar = (props: Props) => {
  const { profile, className, avatarSize = 45, showAvatar = true, shouldRedirect = true } = props

  if (!profile) return null

  const { userHandle, displayName, verified, teamMember, badges } = profile

  return (
    <div className={classNames('flex items-center gap-2 truncate font-bold', className)}>
      {showAvatar && <Avatar profile={profile} pixels={avatarSize} />}

      {shouldRedirect ? (
        <NextLink href={`/profiles/${userHandle}`} passHref>
          <a className="flex flex-col items-start truncate" aria-label={displayName}>
            <DisplayName
              className="text-sm"
              name={displayName || ''}
              verified={verified}
              teamMember={teamMember}
              badges={badges}
            />
            <p className="text-xxs text-gray-CC">@{userHandle}</p>
          </a>
        </NextLink>
      ) : (
        <div className="flex flex-col items-start truncate">
          <DisplayName
            className="text-sm"
            name={displayName || ''}
            verified={verified}
            teamMember={teamMember}
            badges={badges}
          />
          <p className="text-xxs text-gray-CC">@{userHandle}</p>
        </div>
      )}
    </div>
  )
}
