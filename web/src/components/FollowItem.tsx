import { Profile } from 'lib/graphql';
import Link from 'next/link';
import { Avatar } from './Avatar';

interface FollowItemProps {
  profile: Profile;
}

export const FollowItem = ({ profile }: FollowItemProps) => {
  return (
    <Link href={`/profiles/${profile.userHandle}`} passHref>
      <div className="flex flex-row space-x-2 items-center cursor-pointer">
        <div className="items-center self-center content-center">
          <Avatar pixels={40} className="flex" profile={profile} />
        </div>
        <div className="text-white font-bold text-sm">{profile.displayName}</div>
      </div>
    </Link>
  );
};
