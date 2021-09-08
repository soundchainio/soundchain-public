import { Profile } from 'lib/graphql';
import { Avatar } from './Avatar';
import Link from 'next/link';

interface FollowItemProps {
  profile: Profile;
}

export const FollowItem = ({ profile }: FollowItemProps) => {
  return (
    <Link href={`/profiles/${profile.id}`} passHref>
      <div className="flex flex-row space-x-2 items-center">
        <div className="items-center self-center content-center">
          <Avatar pixels={40} className="flex" profile={profile} />
        </div>
        <div className="text-white font-bold">{profile.displayName}</div>
      </div>
    </Link>
  );
};
