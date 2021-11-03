import { Profile } from 'lib/graphql';
import Link from 'next/link';
import { Avatar } from './Avatar';
import { DisplayName } from './DisplayName';

interface FollowItemProps {
  profile: Profile;
}

export const FollowItem = ({ profile }: FollowItemProps) => {
  return (
    <Link href={`/profiles/${profile.id}`} passHref>
      <div className="flex flex-row space-x-2 items-center cursor-pointer">
        <div className="items-center self-center content-center">
          <Avatar pixels={40} className="flex" profile={profile} />
        </div>
        <DisplayName name={profile.displayName} verified={profile.verified} />
      </div>
    </Link>
  );
};
