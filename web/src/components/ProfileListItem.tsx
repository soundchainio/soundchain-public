import { Avatar } from 'components/Avatar';
import { FollowButton } from 'components/FollowButton';
import { MessageButton } from 'components/MessageButton';
import { ProfileListItemSkeleton } from 'components/ProfileListItemSkeleton';
import { Profile } from 'lib/graphql';
import NextLink from 'next/link';
import { DisplayName } from './DisplayName';
import { SubscribeButton } from './SubscribeButton';

interface ProfileListItemProps {
  profile: Profile;
}

export const ProfileListItem = ({ profile }: ProfileListItemProps) => {
  if (!profile) return <ProfileListItemSkeleton />;

  return (
    <div className="relative rounded-lg bg-black p-0.5 hover:bg-rainbow-gradient">
      <div className="relative flex items-center gap-3 rounded-lg bg-black px-3 py-3">
        <NextLink href={`/profiles/${profile.userHandle}`}>
          <a className="relative flex flex-1 items-center gap-3 overflow-hidden rounded-lg">
            <Avatar
              linkToProfile={false}
              profile={profile}
              pixels={60}
              className="h-[60px] w-[60px] flex-shrink-0 rounded-full"
            />
            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 gap-2">
                <div className="min-w-0">
                  <DisplayName
                    name={profile.displayName}
                    verified={profile.verified}
                    teamMember={profile.teamMember}
                    className="text-sm"
                  />
                  <p className="truncate text-xs font-semibold text-gray-80">{`@${profile.userHandle}`}</p>
                </div>
                <SubscribeButton small profileId={profile.id} isSubscriber={profile.isSubscriber} />
              </div>
              <dl className="mt-3 flex gap-3">
                <div className="flex flex-col items-center">
                  <dt className="text-xs font-bold text-white">{profile.followerCount}</dt>
                  <dd className="text-xxs text-gray-80">Followers</dd>
                </div>
                <div className="flex flex-col items-center">
                  <dt className="text-xs font-bold text-white ">{profile.followingCount}</dt>
                  <dd className="text-xxs text-gray-80">Following</dd>
                </div>
              </dl>
            </div>
          </a>
        </NextLink>
        <div className="flex flex-col gap-2 md:flex-row">
          <FollowButton
            showIcon
            followedHandle={profile.userHandle}
            followedId={profile.id}
            isFollowed={profile.isFollowed}
          />
          <MessageButton profileId={profile.id} />
        </div>
      </div>
    </div>
  );
};
