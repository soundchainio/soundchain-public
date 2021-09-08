import { Profile } from 'lib/graphql';
import { Avatar } from './Avatar';

interface FollowItemProps {
  profile: Profile;
}

export const FollowItem = ({ profile }: FollowItemProps) => {
  return (
    <div className="flex flex-row space-x-2 items-center">
      <div className="items-center self-center content-center">
        <Avatar pixels={40} className="flex" profile={profile} />
      </div>
      <div className="text-white font-bold">{profile.displayName}</div>
    </div>
  );
};
