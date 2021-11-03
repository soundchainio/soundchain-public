import { Profile } from 'lib/graphql';
import Image from 'next/image';
import NextLink from 'next/link';
import React from 'react';

interface AvatarProps extends React.ComponentPropsWithoutRef<'a'> {
  profile: Partial<Profile>;
  pixels?: number;
  className?: string;
  linkToProfile?: boolean;
}

export const Avatar = ({ profile, pixels = 30, linkToProfile = true, ...props }: AvatarProps) => {
  const maybeLinkToProfile = (children: JSX.Element) => {
    return linkToProfile && Boolean(profile.userHandle) ? (
      <NextLink href={`/profiles/${profile.userHandle}`}>{children}</NextLink>
    ) : (
      children
    );
  };

  return maybeLinkToProfile(
    <a {...props}>
      {
        <Image
          alt="Profile picture"
          src={profile.profilePicture || '/default-pictures/profile/red.png'}
          width={pixels}
          height={pixels}
          className="rounded-full cursor-pointer"
          objectFit="cover"
        />
      }
    </a>,
  );
};
