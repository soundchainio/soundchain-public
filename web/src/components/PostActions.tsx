import { ChatAltIcon, RefreshIcon, ShareIcon, ThumbUpIcon } from '@heroicons/react/solid';
import classNames from 'classnames';
import NextLink from 'next/link';
import React, { useState } from 'react';
import { ReactionSelector } from './ReactionSelector';

interface PostActionsProps {
  postId: string;
  myReaction: string | null;
}

const commonClasses = 'text-white text-sm text-gray-400 text-center font-bold flex-1 flex justify-center px-1';

export const PostActions = ({ postId, myReaction }: PostActionsProps) => {
  const [reactionSelectorOpened, setReactionSelectorOpened] = useState(false);

  const handleLikeButton = () => {
    setReactionSelectorOpened(!reactionSelectorOpened);
  };

  return (
    <div className="bg-gray-25 px-0 py-2 flex items-center relative overflow-hidden">
      <div className={commonClasses}>
        <div
          className={classNames('flex items-center cursor-pointer', { 'text-[#75E6FF]': Boolean(myReaction) })}
          onClick={handleLikeButton}
        >
          <ThumbUpIcon className="h-4 w-4 mr-1" />
          Like
        </div>
      </div>
      <ReactionSelector postId={postId} opened={reactionSelectorOpened} setOpened={setReactionSelectorOpened} />
      <div className={commonClasses}>
        <NextLink href={`/posts/${postId}`}>
          <a className="flex items-center cursor-pointer">
            <ChatAltIcon className="h-4 w-4 mr-1" />
            Comment
          </a>
        </NextLink>
      </div>
      <div className={commonClasses}>
        <div className="flex items-center cursor-pointer">
          <RefreshIcon className="h-4 w-4 mr-1" />
          Repost
        </div>
      </div>
      <div className={commonClasses}>
        <div className="flex items-center cursor-pointer">
          <ShareIcon className="h-4 w-4 mr-1" />
          Share
        </div>
      </div>
    </div>
  );
};
