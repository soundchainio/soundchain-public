import { Profile } from 'lib/graphql'
import Image from 'next/image'
import NextLink from 'next/link'
import React from 'react'

interface AvatarProps extends React.ComponentPropsWithoutRef<'div'> {
  profile: Partial<Profile>
  pixels?: number
  className?: string
  linkToProfile?: boolean
}

export const Avatar = ({ profile, pixels = 30, linkToProfile = true, ...props }: AvatarProps) => {
  if (!linkToProfile) {
    return <Content profile={profile} pixels={pixels} {...props} />
  }

  return (
    <NextLink href={`/profiles/${profile.userHandle}`} passHref>
      <a className="flex-shrink-0" aria-label={profile.displayName}>
        <Content profile={profile} pixels={pixels} {...props} />
      </a>
    </NextLink>
  )
}

const Content = ({ profile, pixels = 30, ...props }: AvatarProps) => {
  return (
    <div className="flex flex-shrink-0 items-center" {...props}>
      <Image
        alt="Profile picture"
        src={profile.profilePicture || '/default-pictures/profile/red.png'}
        width={pixels}
        height={pixels}
        className="cursor-pointer rounded-full"
        objectFit="cover"
      />
    </div>
  )
}
