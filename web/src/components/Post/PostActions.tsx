import React, { useEffect, useState } from 'react'

import { ReactionSelector } from 'components/ReactionSelector'
import { useModalDispatch } from 'contexts/ModalContext'
import { useMe } from 'hooks/useMe'
import { ReactionEmoji } from 'icons/ReactionEmoji'
import { delayFocus } from 'lib/delayFocus'
import { ReactionType, useBookmarkPostMutation, useUnbookmarkPostMutation } from 'lib/graphql'
import { createPostArchive, downloadArchive, generateArchiveFilename, isMobileDevice } from 'lib/postArchive'
import NextLink from 'next/link'
import { useRouter } from 'next/router'
import { toast } from 'react-toastify'

import { ChatBubbleLeftIcon, ArrowPathIcon, ShareIcon, HandThumbUpIcon } from '@heroicons/react/24/outline'
import { Bookmark, Archive, Info } from 'lucide-react'

interface PostActionsProps {
  postId: string
  myReaction: ReactionType | null
  isBookmarked?: boolean
  // Archive feature props
  isEphemeral?: boolean
  isOwner?: boolean
  postData?: {
    id: string
    body: string | null
    createdAt: string
    uploadedMediaUrl?: string | null
    uploadedMediaType?: string | null
    totalReactions?: number
    commentCount?: number
    repostCount?: number
    profile?: {
      id: string
      displayName: string
      userHandle: string
    } | null
  }
}

const commonClasses = 'text-white text-sm text-gray-80 text-center flex-1 flex justify-center px-1'

export const PostActions = ({ postId, myReaction, isBookmarked: initialIsBookmarked, isEphemeral, isOwner, postData }: PostActionsProps) => {
  const [reactionSelectorOpened, setReactionSelectorOpened] = useState(false)
  const { dispatchSetRepostId, dispatchShowPostModal, dispatchShowCommentModal } = useModalDispatch()
  const [postLink, setPostLink] = useState('')
  const [guestWallet, setGuestWallet] = useState<string | null>(null)
  const [isBookmarked, setIsBookmarked] = useState(initialIsBookmarked ?? false)
  const [isArchiving, setIsArchiving] = useState(false)
  const [showArchiveInfo, setShowArchiveInfo] = useState(false)
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

  // Archive ephemeral post to device
  const handleArchiveClick = async () => {
    if (!postData || isArchiving) return

    setIsArchiving(true)
    try {
      toast.info('Creating archive...', { autoClose: 2000 })

      // Create the archive blob
      const archiveBlob = await createPostArchive(postData)

      // Generate filename
      const filename = generateArchiveFilename(postData)

      // Download to device
      const success = await downloadArchive(archiveBlob, filename, isMobileDevice())

      if (success) {
        toast.success('Post archived to your device!')
      }
    } catch (err) {
      console.error('Archive error:', err)
      toast.error('Failed to archive post')
    } finally {
      setIsArchiving(false)
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
    <div className="relative flex items-center bg-gray-25 px-0 py-2">
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
        <button
          className="flex items-center font-bold"
          onClick={() => dispatchShowCommentModal({ show: true, postId })}
        >
          <ChatBubbleLeftIcon className="mr-1 h-4 w-4" />
          Reply
        </button>
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
      {/* Archive button - only for ephemeral posts owned by the user */}
      {isEphemeral && isOwner && postData && (
        <div className={`${commonClasses} relative`}>
          <button
            className={`flex items-center font-bold ${isArchiving ? 'opacity-50' : ''}`}
            onClick={handleArchiveClick}
            disabled={isArchiving}
          >
            <Archive className={`mr-1 h-4 w-4 ${isArchiving ? 'animate-pulse' : ''}`} />
            <span>{isArchiving ? 'Saving...' : 'Archive'}</span>
          </button>
          {/* Info icon with tooltip */}
          <button
            className="ml-1 text-neutral-500 hover:text-cyan-400 transition-colors"
            onClick={(e) => {
              e.stopPropagation()
              setShowArchiveInfo(!showArchiveInfo)
            }}
            onMouseEnter={() => setShowArchiveInfo(true)}
            onMouseLeave={() => setShowArchiveInfo(false)}
          >
            <Info className="h-3.5 w-3.5" />
          </button>
          {/* Archive info tooltip */}
          {showArchiveInfo && (
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-72 p-3 bg-neutral-800 border border-neutral-700 rounded-lg shadow-xl z-50 text-left">
              <div className="flex items-center gap-2 mb-2">
                <Archive className="h-4 w-4 text-amber-500" />
                <span className="font-semibold text-white text-sm">Web3 Archive</span>
              </div>
              <p className="text-xs text-neutral-300 leading-relaxed mb-2">
                <strong className="text-cyan-400">Your content. Your device. Your control.</strong>
              </p>
              <p className="text-xs text-neutral-400 leading-relaxed mb-2">
                Archive saves your 24-hour post directly to your device as a <span className="text-amber-400">.soundchain</span> file - no cloud, no servers, just you.
              </p>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Re-upload anytime at <span className="text-cyan-400">/dex/archive-import</span> to repost your content. True digital ownership, the Web3 way.
              </p>
              {/* Arrow */}
              <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-neutral-800" />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
