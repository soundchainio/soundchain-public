import { Profile } from 'lib/graphql';
import Image from 'next/image';
import NextLink from 'next/link';
import React from 'react';

interface AvatarProps extends React.ComponentPropsWithoutRef<'div'> {
  profile: Partial<Profile>;
  pixels?: number;
  className?: string;
  linkToProfile?: boolean;
}

export const Avatar = ({ profile, pixels = 30, linkToProfile = true, ...props }: AvatarProps) => {
  const maybeLinkToProfile = (children: JSX.Element) => {
    return linkToProfile && Boolean(profile.id) ? (
      <NextLink href={`/profiles/${profile.id}`}>{children}</NextLink>
    ) : (
      children
    );
  };

  return maybeLinkToProfile(
    <div {...props}>
      {
        <Image
          alt="Profile picture"
          src={profile.profilePicture || '/default-pictures/profile/red.png'}
          width={pixels}
          height={pixels}
          className="rounded-full"
          objectFit="cover"
        />
      }
    </div>,
  );
};
