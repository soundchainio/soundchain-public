import { ChatAltIcon, RefreshIcon, ShareIcon, ThumbUpIcon } from '@heroicons/react/solid';
import { useModalDispatch } from 'contexts/providers/modal';
import { useMe } from 'hooks/useMe';
import { ReactionEmoji } from 'icons/ReactionEmoji';
import { delayFocus } from 'lib/delayFocus';
import { ReactionType } from 'lib/graphql';
import NextLink from 'next/link';
import { useRouter } from 'next/router';
import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { ReactionSelector } from './ReactionSelector';

interface PostActionsProps {
  postId: string;
  myReaction: ReactionType | null;
}

const commonClasses = 'text-white text-sm text-gray-80 text-center flex-1 flex justify-center px-1';

export const PostActions = ({ postId, myReaction }: PostActionsProps) => {
  const [reactionSelectorOpened, setReactionSelectorOpened] = useState(false);
  const { dispatchSetRepostId, dispatchShowPostModal } = useModalDispatch();
  const [postLink, setPostLink] = useState('');
  const me = useMe();
  const router = useRouter();

  const onRepostClick = () => {
    //if (!me) return router.push('/login');
    dispatchSetRepostId(postId);
    dispatchShowPostModal(true);
  };

  const handleLikeButton = () => {
    //if (!me) return router.push('/login');
    setReactionSelectorOpened(!reactionSelectorOpened);
  };

  const onShareClick = () => {
    try {
      navigator
        .share({
          title: `SoundChain`,
          text: `Check out this publication on SoundChain!`,
          url: postLink,
        })
        .catch(error => {
          if (!error.toString().includes('AbortError')) {
            toast('URL copied to clipboard');
          }
        });
    } catch (err) {
      navigator.clipboard.writeText(postLink);
      toast('URL copied to clipboard');
    }
  };

  useEffect(() => {
    const origin = window.location.origin;
    setPostLink(`${origin}/posts/${postId}`);

    if (router.asPath.includes('#openComment')) {
      delayFocus('#commentField');
    }
  }, []);

  return (
    <div className="bg-gray-25 px-0 py-2 flex items-center relative overflow-hidden">
      <div className={commonClasses}>
        <button className="flex items-center font-bold space-x-1" onClick={handleLikeButton}>
          {myReaction ? <ReactionEmoji name={myReaction} className="w-4 h-4" /> : <ThumbUpIcon className="h-4 w-4" />}
          <span className={myReaction ? 'text-[#62AAFF]' : ''}>Like</span>
        </button>
      </div>
      <ReactionSelector
        postId={postId}
        myReaction={myReaction}
        opened={reactionSelectorOpened}
        setOpened={setReactionSelectorOpened}
      />
      <div className={commonClasses}>
        <NextLink href={`/posts/${postId}#openComment`}>
          <a className="flex items-center font-bold">
            <ChatAltIcon className="h-4 w-4 mr-1" />
            Comment
          </a>
        </NextLink>
      </div>
      <div className={commonClasses}>
        <button className="flex items-center font-bold" onClick={onRepostClick}>
          <RefreshIcon className="h-4 w-4 mr-1" />
          Repost
        </button>
      </div>
      <div className={commonClasses}>
        <button className="flex items-center font-bold" onClick={onShareClick}>
          <ShareIcon className="h-4 w-4 mr-1" />
          Share
        </button>
      </div>
    </div>
  );
};
