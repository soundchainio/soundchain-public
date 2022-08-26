import classNames from 'classnames'
import { Profile } from 'lib/graphql'
import NextLink from 'next/link'
import React from 'react'
import { Avatar } from './Avatar'
import { DisplayName } from './DisplayName'

interface Props {
  profile: Partial<Profile>
  className?: string
}

export const ProfileWithAvatar = ({ profile, className }: Props) => {
  if (!profile) {
    return null
  }

  const { userHandle, displayName, verified, teamMember } = profile

  return (
    <div className={classNames('flex items-center gap-2 truncate font-bold', className)}>
      <Avatar profile={profile} pixels={30} />
      <NextLink href={`/profiles/${userHandle}`} passHref>
        <a className="truncate" aria-label={displayName}>
          <DisplayName className="text-sm" name={displayName || ''} verified={verified} teamMember={teamMember} />
          <p className="text-xxs text-gray-CC">@{userHandle}</p>
        </a>
      </NextLink>
    </div>
  )
}
