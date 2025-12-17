import React, { useEffect, useState } from 'react'

import { ReactionSelector } from 'components/ReactionSelector'
import { useModalDispatch } from 'contexts/ModalContext'
import { useMe } from 'hooks/useMe'
import { ReactionEmoji } from 'icons/ReactionEmoji'
import { delayFocus } from 'lib/delayFocus'
import { ReactionType, useBookmarkPostMutation, useUnbookmarkPostMutation } from 'lib/graphql'
import NextLink from 'next/link'
import { useRouter } from 'next/router'
import { toast } from 'react-toastify'

import { ChatBubbleLeftIcon, ArrowPathIcon, ShareIcon, HandThumbUpIcon } from '@heroicons/react/24/outline'
import { Bookmark } from 'lucide-react'

interface PostActionsProps {
  postId: string
  myReaction: ReactionType | null
  isBookmarked?: boolean
}

const commonClasses = 'text-white text-sm text-gray-80 text-center flex-1 flex justify-center px-1'

export const PostActions = ({ postId, myReaction, isBookmarked: initialIsBookmarked }: PostActionsProps) => {
  const [reactionSelectorOpened, setReactionSelectorOpened] = useState(false)
  const { dispatchSetRepostId, dispatchShowPostModal } = useModalDispatch()
  const [postLink, setPostLink] = useState('')
  const [guestWallet, setGuestWallet] = useState<string | null>(null)
  const [isBookmarked, setIsBookmarked] = useState(initialIsBookmarked ?? false)
  const me = useMe()
  const router = useRouter()

  // Bookmark mutations
  const [bookmarkPost, { loading: bookmarking }] = useBookmarkPostMutation()
  const [unbookmarkPost, { loading: unbookmarking }] = useUnbookmarkPostMutation()

  // Sync local state with prop
  useEffect(() => {
    setIsBookmarked(initialIsBookmarked ?? false)
  }, [initialIsBookmarked])

  // Check for guest wallet on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && !me) {
      const savedWallet = localStorage.getItem('connectedWalletAddress')
      if (savedWallet) {
        setGuestWallet(savedWallet)
      }
    }
  }, [me])

  const isGuest = !me && !!guestWallet

  const onRepostClick = () => {
    if (!me) return router.push('/login')
    dispatchSetRepostId(postId)
    dispatchShowPostModal({ show: true })
  }

  const handleLikeButton = () => {
    // Allow likes for logged-in users OR guests with connected wallet
    if (!me && !guestWallet) return router.push('/login')
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

  const handleBookmarkClick = async () => {
    if (!me) return // Bookmarks only for logged-in users
    if (bookmarking || unbookmarking) return

    try {
      if (isBookmarked) {
        await unbookmarkPost({ variables: { postId } })
        setIsBookmarked(false)
        toast('Removed from bookmarks')
      } else {
        await bookmarkPost({ variables: { postId } })
        setIsBookmarked(true)
        toast('Added to bookmarks')
      }
    } catch (err) {
      console.error('Bookmark error:', err)
      toast('Failed to update bookmark')
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
          {myReaction ? <ReactionEmoji name={myReaction} className="h-4 w-4" /> : <HandThumbUpIcon className="h-4 w-4" />}
          <span className={myReaction ? 'text-[#62AAFF]' : ''}>Like</span>
        </button>
      </div>
      <ReactionSelector
        postId={postId}
        myReaction={myReaction}
        opened={reactionSelectorOpened}
        setOpened={setReactionSelectorOpened}
        isGuest={isGuest}
        guestWallet={guestWallet}
      />
      <div className={commonClasses}>
        <NextLink href={`/posts/${postId}#openComment`} className="flex items-center font-bold">
          <ChatBubbleLeftIcon className="mr-1 h-4 w-4" />
          Comment
        </NextLink>
      </div>
      <div className={commonClasses}>
        <button className="flex items-center font-bold" onClick={onRepostClick}>
          <ArrowPathIcon className="mr-1 h-4 w-4" />
          Repost
        </button>
      </div>
      <div className={commonClasses}>
        <button className="flex items-center font-bold" onClick={onShareClick}>
          <ShareIcon className="mr-1 h-4 w-4" />
          Share
        </button>
      </div>
      {/* Bookmark button - only for logged-in users */}
      {me && (
        <div className={commonClasses}>
          <button
            className={`flex items-center font-bold ${bookmarking || unbookmarking ? 'opacity-50' : ''}`}
            onClick={handleBookmarkClick}
            disabled={bookmarking || unbookmarking}
          >
            {isBookmarked ? (
              <Bookmark className="mr-1 h-4 w-4 text-[#62AAFF] fill-[#62AAFF]" />
            ) : (
              <Bookmark className="mr-1 h-4 w-4" />
            )}
            <span className={isBookmarked ? 'text-[#62AAFF]' : ''}>Save</span>
          </button>
        </div>
      )}
    </div>
  )
}
