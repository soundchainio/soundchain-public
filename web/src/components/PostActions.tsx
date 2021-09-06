import { ChatAltIcon, RefreshIcon, ShareIcon, ThumbUpIcon } from '@heroicons/react/solid';
import { useModalDispatch } from 'contexts/providers/modal';
import { useMe } from 'hooks/useMe';
import { ReactionEmoji } from 'icons/ReactionEmoji';
import { ReactionType } from 'lib/graphql';
import NextLink from 'next/link';
import { useRouter } from 'next/router';
import React, { useEffect, useState } from 'react';
import { isMobile } from 'utils/IsMobile';
import { ReactionSelector } from './ReactionSelector';
import { SharePostLink } from './SharePostLink';

interface PostActionsProps {
  postId: string;
  myReaction: ReactionType | null;
}

const commonClasses = 'text-white text-sm text-gray-80 text-center font-bold flex-1 flex justify-center px-1';

export const PostActions = ({ postId, myReaction }: PostActionsProps) => {
  const [reactionSelectorOpened, setReactionSelectorOpened] = useState(false);
  const [shareOpened, setShareOpened] = useState(false);
  const { dispatchSetRepostId, dispatchShowNewPostModal } = useModalDispatch();
  const [postLink, setPostLink] = useState('');
  const me = useMe()
  const router = useRouter()

  const onRepostClick = () => {
    if (!me) return router.push('/login')
    dispatchSetRepostId(postId);
    dispatchShowNewPostModal(true);
  };

  const handleLikeButton = () => {
    if (!me) return router.push('/login')
    setReactionSelectorOpened(!reactionSelectorOpened);
  };

  const onShareClick = () => {
    isMobile() ? (navigator.share ? navigator.share({ url: postLink }) : setShareOpened(true)) : setShareOpened(true);
  };

  useEffect(() => {
    const origin = window.location.origin;
    setPostLink(`${origin}/posts/${postId}`);
  }, []);

  return (
    <div className="bg-gray-25 px-0 py-2 flex items-center relative overflow-hidden">
      <div className={commonClasses}>
        <div className="flex items-center cursor-pointer space-x-1" onClick={handleLikeButton}>
          {myReaction ? <ReactionEmoji name={myReaction} className="w-4 h-4" /> : <ThumbUpIcon className="h-4 w-4" />}
          <span className={myReaction ? 'text-[#62AAFF]' : ''}>Like</span>
        </div>
      </div>
      <ReactionSelector
        postId={postId}
        myReaction={myReaction}
        opened={reactionSelectorOpened}
        setOpened={setReactionSelectorOpened}
      />
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
