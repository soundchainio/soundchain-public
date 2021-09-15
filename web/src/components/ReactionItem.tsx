import { ReactionEmoji } from 'icons/ReactionEmoji';
import { Reaction, ReactionType } from 'lib/graphql';
import { useRouter } from 'next/router';
import { Avatar } from './Avatar';

interface FollowItemProps {
  reaction: Reaction;
  onClick: () => void;
}

export const ReactionItem = ({ reaction: { type, profile }, onClick }: FollowItemProps) => {
  const router = useRouter();
  const onReactionClick = () => {
    onClick();
    router.push(`/profiles/${profile.id}`);
  };

  return (
    <div className="flex flex-row space-x-2 items-center" onClick={onReactionClick}>
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
  );
};
