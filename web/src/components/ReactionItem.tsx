import { ReactionEmoji } from 'icons/ReactionEmoji';
import { Reaction, ReactionType } from 'lib/graphql';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Avatar } from './Avatar';
import { DisplayName } from './DisplayName';

interface FollowItemProps {
  reaction: Reaction;
  onClick: () => void;
}

export const ReactionItem = ({ reaction: { type, profile }, onClick }: FollowItemProps) => {
  const router = useRouter();
  const onReactionClick = () => {
    onClick();
    router.push(`/profiles/${profile.userHandle}`);
  };

  return (
    <div className="flex flex-row justify-between space-x-2 items-center px-4 py-3" onClick={onReactionClick}>
      <Link href={`/profiles/${profile.userHandle}`} passHref>
        <a className="flex flex-row gap-2 items-center text-sm truncate">
          <Avatar pixels={40} className="flex" profile={profile} />
          <DisplayName name={profile.displayName} verified={profile.verified} teamMember={profile.teamMember} />
        </a>
      </Link>
      <div className="flex items-center justify-center">
        <ReactionEmoji name={type.toUpperCase() as ReactionType} className="w-4 h-4" />
      </div>
    </div>
  );
};
