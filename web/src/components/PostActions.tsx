import { ChatAltIcon, RefreshIcon, ShareIcon, ThumbUpIcon } from '@heroicons/react/solid';
import { useModalDispatch } from 'contexts/providers/modal';
import { ReactionEmoji } from 'icons/ReactionEmoji';
import { ReactionType } from 'lib/graphql';
import NextLink from 'next/link';
import React, { useState } from 'react';
import { ReactionSelector } from './ReactionSelector';
import { SharePostLink } from './SharePostLink';

interface PostActionsProps {
  postId: string;
  myReaction: ReactionType | null;
}

const commonClasses = 'text-white text-sm text-gray-80 text-center font-bold flex-1 flex justify-center px-1';

const isMobile = () => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

export const PostActions = ({ postId, myReaction }: PostActionsProps) => {
  const [reactionSelectorOpened, setReactionSelectorOpened] = useState(false);
  const [shareOpened, setShareOpened] = useState(false);
  const { dispatchSetRepostId, dispatchShowNewPostModal } = useModalDispatch();

  const postLink = `${process.env.NEXT_PUBLIC_CURRENT_DOMAIN}/posts/${postId}`;

  const onRepostClick = () => {
    dispatchSetRepostId(postId);
    dispatchShowNewPostModal(true);
  };

  const handleLikeButton = () => {
    setReactionSelectorOpened(!reactionSelectorOpened);
  };

  const onShareClick = () => {
    if (isMobile()) {
      navigator.share({ url: postLink });
    } else {
      setShareOpened(true);
    }
  };

  return (
    <div className="bg-gray-25 px-0 py-2 flex items-center relative overflow-hidden">
      <div className={commonClasses}>
        <div className="flex items-center cursor-pointer space-x-1" onClick={handleLikeButton}>
          {myReaction ? <ReactionEmoji name={myReaction} className="w-4 h-4" /> : <ThumbUpIcon className="h-4 w-4" />}
          <span className={myReaction ? 'text-[#62AAFF]' : ''}>Like</span>
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
        <div className="flex items-center cursor-pointer" onClick={onRepostClick}>
          <RefreshIcon className="h-4 w-4 mr-1" />
          Repost
        </div>
      </div>
      <div className={commonClasses}>
        <div className="flex items-center cursor-pointer" onClick={onShareClick}>
          <ShareIcon className="h-4 w-4 mr-1" />
          Share
        </div>
      </div>
      <SharePostLink opened={shareOpened} setOpened={setShareOpened} link={postLink} postId={postId} />
    </div>
  );
};
