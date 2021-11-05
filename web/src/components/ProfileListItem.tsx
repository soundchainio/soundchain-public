import { Avatar } from 'components/Avatar';
import { Number } from 'components/Number';
import { ProfileListItemSkeleton } from 'components/ProfileListItemSkeleton';
import { Profile } from 'lib/graphql';
import NextLink from 'next/link';

interface ProfileListItemProps {
  profile: Profile;
}

export const ProfileListItem = ({ profile }: ProfileListItemProps) => {
  if (!profile) return <ProfileListItemSkeleton />;

  return (
    <NextLink href={`/profiles/${profile.userHandle}`}>
      <div className="flex items-center bg-gray-20 rounded-lg p-1">
        <div className="flex items-center justify-start space-x-3">
          <Avatar profile={profile} pixels={50} className="rounded-full min-w-max flex" />
          <div className="w-full">
            <span className="font-bold text-sm text-white overflow-ellipsis overflow-hidden">{profile.displayName}</span>
            <p className="text-gray-80 text-xs leading-tight">@{profile.userHandle}</p>
        </div>
        </div>
        <div className="flex-1 flex justify-end">
          <div className="text-center text-sm cursor-pointer">
            <p className="font-semibold text-white">
              <Number value={profile.followerCount} />
            </p>
            <p className="text-gray-80 text-xs">Followers</p>
          </div>
          <div className="text-center text-sm cursor-pointer mx-2">
            <p className="font-semibold text-white">
              <Number value={profile.followingCount} />
            </p>
            <p className="text-gray-80 text-xs">Following</p>
          </div>
        </div>
      </div>
    </NextLink>
  );
};
