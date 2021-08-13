import { ChatAltIcon, RefreshIcon, ShareIcon, ThumbUpIcon } from '@heroicons/react/solid';
import NextLink from 'next/link';
import React, { useState } from 'react';
import { PostLikeOptions } from './PostLikeOptions';

interface PostActionsProps {
  postId: string;
}

const commonClasses = 'text-white text-sm text-gray-400 text-center font-bold flex-1 flex justify-center px-1';

export const PostActions = ({ postId }: PostActionsProps) => {
  const [likeOptionsOpened, setLikeOptionsOpened] = useState(false);

  const handleLikeButton = () => {
    setLikeOptionsOpened(!likeOptionsOpened);
  };

  return (
    <div className="bg-gray-25 px-0 py-2 flex items-center relative overflow-hidden">
      <div className={commonClasses}>
        <div className="flex items-center cursor-pointer" onClick={handleLikeButton}>
          <ThumbUpIcon className="h-4 w-4 mr-1" />
          Like
        </div>
      </div>
      <PostLikeOptions setLikeOptionsOpened={setLikeOptionsOpened} likeOptionsOpened={likeOptionsOpened} />
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
