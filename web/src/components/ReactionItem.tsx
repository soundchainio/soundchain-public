import { Avatar } from 'components/Avatar'
import { ReactionEmoji } from 'icons/ReactionEmoji'
import { Reaction, ReactionType } from 'lib/graphql'
import Link from 'next/link'
import { useRouter } from 'next/router'

import { DisplayName } from './DisplayName'

interface ReactionItemProps {
  reaction: Reaction;
  onClick: () => void;
}

export const ReactionItem = ({ reaction: { type, profile }, onClick }: ReactionItemProps) => {
  const router = useRouter();

  const onReactionClick = () => {
    onClick();
    router.push(`/profiles/${profile.userHandle}`);
  };

  return (
    <div className="flex flex-row items-center justify-between space-x-2 px-4 py-3" onClick={onReactionClick}>
      <Link
        href={`/profiles/${profile.userHandle}`}
        passHref
        className="flex flex-row items-center gap-2 truncate text-sm"
      >
        <Avatar linkToProfile={false} pixels={40} className="flex" profile={profile} />
        <DisplayName
          name={profile.displayName}
          verified={profile.verified}
          teamMember={profile.teamMember}
          badges={profile.badges}
        />
      </Link>
      {/* Keep ReactionEmoji for better UI */}
      <div className="flex items-center justify-center">
        <ReactionEmoji name={type.toUpperCase() as ReactionType} className="h-4 w-4" />
      </div>
    </div>
  );
};
