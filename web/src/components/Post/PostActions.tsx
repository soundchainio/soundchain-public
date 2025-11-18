import React, { useEffect, useState } from 'react'

import { ReactionSelector } from 'components/ReactionSelector'
import { useModalDispatch } from 'contexts/ModalContext'
import { useMe } from 'hooks/useMe'
import { ReactionEmoji } from 'icons/ReactionEmoji'
import { delayFocus } from 'lib/delayFocus'
import { ReactionType } from 'lib/graphql'
import NextLink from 'next/link'
import { useRouter } from 'next/router'
import { toast } from 'react-toastify'

import { ChatAltIcon, RefreshIcon, ShareIcon, ThumbUpIcon } from '@heroicons/react/24/outline'

interface PostActionsProps {
  postId: string
  myReaction: ReactionType | null
}

const commonClasses = 'text-white text-sm text-gray-80 text-center flex-1 flex justify-center px-1'

export const PostActions = ({ postId, myReaction }: PostActionsProps) => {
  const [reactionSelectorOpened, setReactionSelectorOpened] = useState(false)
  const { dispatchSetRepostId, dispatchShowPostModal } = useModalDispatch()
  const [postLink, setPostLink] = useState('')
  const me = useMe()
  const router = useRouter()

  const onRepostClick = () => {
    if (!me) return router.push('/login')
    dispatchSetRepostId(postId)
    dispatchShowPostModal(true)
  }

  const handleLikeButton = () => {
    if (!me) return router.push('/login')
    setReactionSelectorOpened(!reactionSelectorOpened)
  }

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
            toast('URL copied to clipboard')
          }
        })
    } catch (err) {
      navigator.clipboard.writeText(postLink)
      toast('URL copied to clipboard')
    }
  }

  useEffect(() => {
    const origin = window.location.origin
    setPostLink(`${origin}/posts/${postId}`)

    if (router.asPath.includes('#openComment')) {
      delayFocus('#commentField')
    }
  }, [postId, router.asPath])

  return (
    <div className="relative flex items-center overflow-hidden bg-gray-25 px-0 py-2">
      <div className={commonClasses}>
        <button className="flex items-center space-x-1 font-bold" onClick={handleLikeButton}>
          {myReaction ? <ReactionEmoji name={myReaction} className="h-4 w-4" /> : <ThumbUpIcon className="h-4 w-4" />}
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
        <NextLink href={`/posts/${postId}#openComment`} className="flex items-center font-bold">
          <ChatAltIcon className="mr-1 h-4 w-4" />
          Comment
        </NextLink>
      </div>
      <div className={commonClasses}>
        <button className="flex items-center font-bold" onClick={onRepostClick}>
          <RefreshIcon className="mr-1 h-4 w-4" />
          Repost
        </button>
      </div>
      <div className={commonClasses}>
        <button className="flex items-center font-bold" onClick={onShareClick}>
          <ShareIcon className="mr-1 h-4 w-4" />
          Share
        </button>
      </div>
    </div>
  )
}
