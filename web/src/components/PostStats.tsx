import { useModalDispatch } from 'contexts/providers/modal';
import { ReactionEmoji } from 'icons/ReactionEmoji';
import { ReactionType } from 'lib/graphql';
import React from 'react';
import { Number } from './Number';

interface PostStatsProps {
  totalReactions: number;
  topReactions: ReactionType[];
  commentCount: number;
  repostCount: number;
  postId: string;
}

const validatePlural = (word: string, qty: number) => {
  return <div className="ml-1 mr-4 text-gray-400">{word + (qty !== 1 ? 's' : '')}</div>;
};

export const PostStats = ({ totalReactions, topReactions, commentCount, repostCount, postId }: PostStatsProps) => {
  const { dispatchReactionsModal } = useModalDispatch();
  return (
    <div className="px-0 mt-2 py-2">
      <div className="flex items-center">
        <div
          className="text-sm text-gray-100 flex items-center"
          onClick={() => dispatchReactionsModal(true, postId, topReactions, totalReactions)}
        >
          <div className="flex space-x-1">
            {topReactions.map(reaction => (
              <ReactionEmoji key={reaction} name={reaction} className="w-4 h-4" />
            ))}
          </div>
          <div className="text-white font-bold pl-2">
            <Number value={totalReactions} />
          </div>
          {validatePlural('like', totalReactions)}
        </div>
        <div className="text-sm text-gray-100 flex items-center">
          <div className="text-white font-bold">
            <Number value={commentCount} />
          </div>
          {validatePlural('comment', commentCount)}
        </div>
        <div className="text-sm text-gray-100 flex items-center">
          <div className="text-white font-bold">
            <Number value={repostCount} />
          </div>
          {validatePlural('repost', repostCount)}
        </div>
      </div>
    </div>
  );
};
