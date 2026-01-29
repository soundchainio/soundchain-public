import React from 'react'

import { Profile } from 'lib/graphql'
import Image from 'next/image'
import Link from 'next/link'

interface AvatarProps extends React.ComponentPropsWithoutRef<'div'> {
  profile: Partial<Profile> & { isOnline?: boolean }
  pixels?: number
  className?: string
  linkToProfile?: boolean
  showOnlineIndicator?: boolean
}

export const Avatar = ({ profile, pixels = 30, linkToProfile = true, showOnlineIndicator = false, ...props }: AvatarProps) => {
  if (!linkToProfile) {
    return <Content profile={profile} pixels={pixels} showOnlineIndicator={showOnlineIndicator} {...props} />
  }

  return (
    <Link href={`/profiles/${profile.userHandle}`} passHref className="flex-shrink-0" aria-label={profile.displayName}>
      <Content profile={profile} pixels={pixels} showOnlineIndicator={showOnlineIndicator} {...props} />
    </Link>
  )
}

const Content = ({ profile, pixels = 30, showOnlineIndicator = false, ...props }: AvatarProps) => {
  // Calculate dot size based on avatar size (roughly 1/4 of avatar)
  const dotSize = Math.max(8, Math.round(pixels / 4))

  return (
    <div className="relative flex flex-shrink-0 items-center" {...props}>
      <Image
        alt="Profile picture"
        src={profile.profilePicture || '/default-pictures/profile/red.png'}
        width={pixels}
        height={pixels}
        className="cursor-pointer rounded-full"
        objectFit="cover"
      />
      {showOnlineIndicator && profile.isOnline && (
        <div
          className="absolute bottom-0 right-0 bg-green-500 rounded-full border-2 border-black"
          style={{ width: dotSize, height: dotSize }}
          title="Online now"
        />
      )}
    </div>
  )
}
