import { Reaction } from 'lib/graphql';
import Link from 'next/link';
import { Avatar } from './Avatar';

interface FollowItemProps {
  reaction: Reaction;
}

export const ReactionItem = ({ reaction: { type, profile } }: FollowItemProps) => {
  return (
    <Link href={`/profiles/${profile.id}`} passHref>
      <div className="flex flex-row space-x-2 items-center">
        <div className="items-center self-center content-center">
          <Avatar pixels={40} className="flex" profile={profile} />
        </div>
        <div className="text-white font-bold">
          {profile.displayName} {type}
        </div>
      </div>
    </Link>
  );
};
