import { Reaction, ReactionType } from 'lib/graphql';
import Link from 'next/link';
import { Avatar } from './Avatar';
import { ReactionEmoji } from 'icons/ReactionEmoji';

interface FollowItemProps {
  reaction: Reaction;
}

export const ReactionItem = ({ reaction: { type, profile } }: FollowItemProps) => {
  return (
    <>
      <Link href={`/profiles/${profile.id}`} passHref>
        <div className="flex flex-row space-x-2 items-center">
          <div className="items-center self-center content-center">
            <Avatar pixels={40} className="flex" profile={profile} />
          </div>
          <div className="text-white font-bold flex w-full">
            <div className="flex-1">{profile.displayName}</div>
            <div className="flex w-16 text-center items-center justify-end">
              <ReactionEmoji name={type.toUpperCase() as ReactionType} className="w-4 h-4" />
            </div>
          </div>
        </div>
      </Link>
    </>
  );
};
