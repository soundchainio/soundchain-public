import { Avatar } from 'components/Avatar';
import { Number } from 'components/Number';
import { ProfileListItemSkeleton } from 'components/ProfileListItemSkeleton';
import { Profile } from 'lib/graphql';
import NextLink from 'next/link';
import { DisplayName } from './DisplayName';

interface ProfileListItemProps {
  profile: Profile;
}

export const ProfileListItem = ({ profile }: ProfileListItemProps) => {
  if (!profile) return <ProfileListItemSkeleton />;

  return (
    <NextLink href={`/profiles/${profile.userHandle}`}>
      <a className="relative flex items-center bg-gray-20 px-3 py-2 rounded-lg gap-3">
        <Avatar
          linkToProfile={false}
          profile={profile}
          pixels={40}
          className="rounded-full h-[40px] w-[40px] flex-shrink-0"
        />
        <div>
          <DisplayName name={profile.displayName} verified={profile.verified} className="text-sm" />
          <p className="text-gray-80 text-xxs font-semibold">{`@${profile.userHandle}`}</p>
        </div>
        <div className="flex-1 flex justify-end gap-2">
          <div className="text-center text-sm">
            <p className="font-black text-white">
              <Number value={profile.followerCount} />
            </p>
            <p className="text-gray-80 font-medium text-xs">Followers</p>
          </div>
          <div className="text-center text-sm">
            <p className="font-black text-white">
              <Number value={profile.followingCount} />
            </p>
            <p className="text-gray-80 font-medium text-xs">Following</p>
          </div>
        </div>
      </a>
    </NextLink>
  );
};
