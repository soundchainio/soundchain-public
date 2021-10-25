import { Avatar } from 'components/Avatar';
import { Number } from 'components/Number';
import { ProfileListItemSkeleton } from 'components/ProfileListItemSkeleton';
import { useProfileQuery } from 'lib/graphql';
import NextLink from 'next/link';

interface ProfileListItemProps {
  profileId: string
}

export const ProfileListItem = ({ profileId }: ProfileListItemProps) => {
  const { data } = useProfileQuery({ variables: { id: profileId } });
  const profile = data?.profile;

  if (!profile) return <ProfileListItemSkeleton />;

  return (
    <NextLink href={`/profiles/${profile.id}`}>
      <div className="relative flex items-center bg-gray-20 p-4 m-4 rounded-lg">
        <Avatar
          profile={profile}
          pixels={50}
          className="rounded-full min-w-max"
        />
        <div className="mx-4">
          <span className="font-bold text-md text-white overflow-ellipsis overflow-hidden">{profile.displayName}</span>
          <p className="text-gray-80 text-sm">@{profile.userHandle}</p>
        </div>
        <div className="flex-1 flex justify-end">
          <div className="text-center text-sm cursor-pointer">
            <p className="font-semibold text-white">
              <Number value={profile.followerCount} />
            </p>
            <p className="text-gray-80 text-sm">Followers</p>
          </div>
          <div className="text-center text-sm cursor-pointer mx-2">
            <p className="font-semibold text-white">
              <Number value={profile.followingCount} />
            </p>
            <p className="text-gray-80 text-sm">Following</p>
          </div>
        </div>
      </div>
    </NextLink>
  );
};
