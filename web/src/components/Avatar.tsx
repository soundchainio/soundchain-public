import { Profile } from 'lib/graphql';
import Image from 'next/image';
import NextLink from 'next/link';
import React from 'react';
import { getDefaultProfilePicturePath } from 'utils/DefaultPictures';
import ProfilePic from '../../public/defaultPictures/profile/default-red.png';

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
      {profile.profilePicture ? (
        <Image
          alt="Profile picture"
          src={
            profile.profilePicture.startsWith('default-')
              ? getDefaultProfilePicturePath(profile.profilePicture)
              : profile.profilePicture
          }
          width={pixels}
          height={pixels}
          className="rounded-full"
          objectFit="cover"
        />
      ) : (
        <Image alt="Profile picture" src={ProfilePic} width={pixels} height={pixels} className="rounded-full" />
      )}
    </div>,
  );
};
