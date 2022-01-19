import React from 'react';
import NextLink from 'next/link';
import { Profile } from 'lib/graphql';
import { Avatar } from './Avatar';
import { DisplayName } from './DisplayName';

interface Props {
  profile: Partial<Profile>;
}

export const ProfileWithAvatar = ({ profile }: Props) => {
  if (!profile) {
    return null;
  }

  const { userHandle, displayName, verified, teamMember } = profile;

  return (
    <div className="flex gap-2 items-center truncate">
      <Avatar profile={profile} pixels={30} />
      <NextLink href={`/profiles/${userHandle}`} passHref>
        <a className="font-bold" aria-label={displayName}>
          <DisplayName
            className="w-full text-sm truncate"
            name={displayName || ''}
            verified={verified}
            teamMember={teamMember}
          />
          <p className="text-xxs text-gray-CC">@{userHandle}</p>
        </a>
      </NextLink>
    </div>
  );
};
