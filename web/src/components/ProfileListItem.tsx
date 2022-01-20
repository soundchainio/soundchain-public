import { Avatar } from 'components/Avatar';
import { FollowButton } from 'components/FollowButton';
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
    <div className="relative flex items-center bg-gray-20 px-3 py-2 rounded-lg gap-3">
      <NextLink href={`/profiles/${profile.userHandle}`}>
        <div className="relative flex items-center bg-gray-20 rounded-lg gap-3 flex-1 overflow-hidden">
          <Avatar
            linkToProfile={false}
            profile={profile}
            pixels={40}
            className="rounded-full h-[40px] w-[40px] flex-shrink-0"
          />
          <div className="min-w-0 flex-1">
            <DisplayName
              name={profile.displayName}
              verified={profile.verified}
              teamMember={profile.teamMember}
              className="text-sm"
            />
            <p className="text-gray-80 text-xs font-semibold">{`@${profile.userHandle}`}</p>
          </div>
        </div>
      </NextLink>
      <div>
        <FollowButton followedHandle={profile.userHandle} followedId={profile.id} isFollowed={profile.isFollowed} />
      </div>
    </div>
  );
};
