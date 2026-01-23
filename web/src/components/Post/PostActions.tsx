import React, { useEffect, useState, useRef } from 'react'

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

import { ChatBubbleLeftIcon, ArrowPathIcon, ShareIcon, HandThumbUpIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline'
import { Bookmark, Archive, Info } from 'lucide-react'

// Detect if device supports hover (desktop)
const checkIsDesktop = () => {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(hover: hover)').matches
}

interface PostActionsProps {
  postId: string
  myReaction: ReactionType | null
  isBookmarked?: boolean
  // Count badges for icons
  commentCount?: number
  repostCount?: number
  // Download/Archive feature props
  hasTrack?: boolean  // If true, hide download (NFT protection)
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

// Icon-only action button styles
const commonClasses = 'text-neutral-400 flex-1 flex justify-center'

export const PostActions = ({ postId, myReaction, isBookmarked: initialIsBookmarked, commentCount = 0, repostCount = 0, hasTrack, isEphemeral, isOwner, postData }: PostActionsProps) => {
  const [reactionSelectorOpened, setReactionSelectorOpened] = useState(false)
  const { dispatchSetRepostId, dispatchShowPostModal, dispatchShowCommentModal } = useModalDispatch()
  const [postLink, setPostLink] = useState('')
  const [guestWallet, setGuestWallet] = useState<string | null>(null)
  const [isBookmarked, setIsBookmarked] = useState(initialIsBookmarked ?? false)
  const [isArchiving, setIsArchiving] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const [showArchiveInfo, setShowArchiveInfo] = useState(false)
  const [isDesktop, setIsDesktop] = useState(false)
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const likeButtonRef = useRef<HTMLDivElement>(null)
  const me = useMe()
  const router = useRouter()

  // Detect desktop for hover behavior
  useEffect(() => {
    setIsDesktop(checkIsDesktop())
  }, [])

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

  // Desktop: hover to open, Mobile: tap to open
  const handleLikeButton = () => {
    // On mobile, toggle on tap
    if (!isDesktop) {
      setReactionSelectorOpened(!reactionSelectorOpened)
    }
    // On desktop, clicking selects the default reaction (heart) if no reaction exists
    // Or removes reaction if one exists
    else if (!reactionSelectorOpened) {
      setReactionSelectorOpened(true)
    }
  }

  // Desktop hover handlers
  const handleLikeMouseEnter = () => {
    if (!isDesktop) return
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current)
    setReactionSelectorOpened(true)
  }

  const handleLikeMouseLeave = () => {
    if (!isDesktop) return
    // Small delay before closing to allow moving to the selector
    hoverTimeoutRef.current = setTimeout(() => {
      setReactionSelectorOpened(false)
    }, 300)
  }

  // Keep selector open when hovering over it
  const handleSelectorMouseEnter = () => {
    if (!isDesktop) return
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current)
  }

  const handleSelectorMouseLeave = () => {
    if (!isDesktop) return
    hoverTimeoutRef.current = setTimeout(() => {
      setReactionSelectorOpened(false)
    }, 200)
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

  // Archive ephemeral post to device (owner only)
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

  // Download any post to device (not NFT posts)
  const handleDownloadClick = async () => {
    if (!postData || isDownloading) return

    setIsDownloading(true)
    try {
      toast.info('Preparing download...', { autoClose: 2000 })

      // Create the archive blob (reuse existing archive function)
      const archiveBlob = await createPostArchive(postData)

      // Generate filename with .soundchain extension
      const filename = generateArchiveFilename(postData)

      // Download to device
      const success = await downloadArchive(archiveBlob, filename, isMobileDevice())

      if (success) {
        toast.success('Post downloaded to your device!')
      }
    } catch (err) {
      console.error('Download error:', err)
      toast.error('Failed to download post')
    } finally {
      setIsDownloading(false)
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
    <div className="relative flex items-center bg-neutral-900/50 rounded-lg px-1 py-1.5">
      {/* Like button with hover zone */}
      <div
        ref={likeButtonRef}
        className={`${commonClasses} relative`}
        onMouseEnter={handleLikeMouseEnter}
        onMouseLeave={handleLikeMouseLeave}
      >
        <button
          className="flex items-center justify-center font-medium hover:text-white transition-colors p-2 rounded-lg hover:bg-neutral-800/50"
          onClick={handleLikeButton}
          title="Like"
        >
          {myReaction ? (
            <span className="relative">
              <ReactionEmoji name={myReaction} className="h-4 w-4" />
              {/* Sparkle effect on reacted emoji */}
              <span className="absolute -inset-1 bg-gradient-to-tr from-cyan-500/20 via-transparent to-purple-500/20 rounded-full animate-pulse" />
            </span>
          ) : (
            <HandThumbUpIcon className="h-4 w-4" />
          )}
        </button>

        {/* Hover emoji picker - positioned above on desktop */}
        {reactionSelectorOpened && isDesktop && (
          <div
            className="absolute bottom-full left-0 mb-2 z-50"
            onMouseEnter={handleSelectorMouseEnter}
            onMouseLeave={handleSelectorMouseLeave}
          >
            <div className="bg-neutral-800 border border-neutral-700 rounded-xl p-2 shadow-xl shadow-black/50 flex items-center gap-1">
              <ReactionSelector
                postId={postId}
                myReaction={myReaction}
                opened={true}
                setOpened={setReactionSelectorOpened}
                isGuest={isGuest}
                guestWallet={guestWallet}
                inline
              />
            </div>
          </div>
        )}
      </div>

      {/* Mobile reaction selector - slides in */}
      {!isDesktop && (
        <ReactionSelector
          postId={postId}
          myReaction={myReaction}
          opened={reactionSelectorOpened}
          setOpened={setReactionSelectorOpened}
          isGuest={isGuest}
          guestWallet={guestWallet}
        />
      )}

      <div className={commonClasses}>
        <button
          className="flex items-center justify-center gap-1 font-medium hover:text-white transition-colors p-2 rounded-lg hover:bg-neutral-800/50"
          onClick={() => dispatchShowCommentModal({ show: true, postId })}
          title="Reply"
        >
          <ChatBubbleLeftIcon className="h-4 w-4" />
          {commentCount > 0 && (
            <span className="text-xs text-neutral-400">{commentCount}</span>
          )}
        </button>
      </div>
      <div className={commonClasses}>
        <button
          className="flex items-center justify-center gap-1 font-medium hover:text-white transition-colors p-2 rounded-lg hover:bg-neutral-800/50"
          onClick={onRepostClick}
          title="Repost"
        >
          <ArrowPathIcon className="h-4 w-4" />
          {repostCount > 0 && (
            <span className="text-xs text-neutral-400">{repostCount}</span>
          )}
        </button>
      </div>
      <div className={commonClasses}>
        <button
          className="flex items-center justify-center font-medium hover:text-white transition-colors p-2 rounded-lg hover:bg-neutral-800/50"
          onClick={onShareClick}
          title="Share"
        >
          <ShareIcon className="h-4 w-4" />
        </button>
      </div>
      {/* Download button - all posts except NFTs (track posts) */}
      {!hasTrack && postData && (
        <div className={commonClasses}>
          <button
            className={`flex items-center justify-center p-2 rounded-lg hover:bg-neutral-800/50 transition-colors ${isDownloading ? 'opacity-50' : ''}`}
            onClick={handleDownloadClick}
            disabled={isDownloading}
            title="Download"
          >
            <ArrowDownTrayIcon className={`h-4 w-4 ${isDownloading ? 'animate-pulse' : ''}`} />
          </button>
        </div>
      )}
      {/* Bookmark button - only for logged-in users */}
      {me && (
        <div className={commonClasses}>
          <button
            className={`flex items-center justify-center p-2 rounded-lg hover:bg-neutral-800/50 transition-colors ${bookmarking || unbookmarking ? 'opacity-50' : ''}`}
            onClick={handleBookmarkClick}
            disabled={bookmarking || unbookmarking}
            title="Save"
          >
            {isBookmarked ? (
              <Bookmark className="h-4 w-4 text-[#62AAFF] fill-[#62AAFF]" />
            ) : (
              <Bookmark className="h-4 w-4" />
            )}
          </button>
        </div>
      )}
      {/* Archive button - only for ephemeral posts owned by the user */}
      {isEphemeral && isOwner && postData && (
        <div className={`${commonClasses} relative`}>
          <button
            className={`flex items-center justify-center p-2 rounded-lg hover:bg-neutral-800/50 transition-colors ${isArchiving ? 'opacity-50' : ''}`}
            onClick={handleArchiveClick}
            disabled={isArchiving}
            title={isArchiving ? 'Saving...' : 'Archive'}
          >
            <Archive className={`h-4 w-4 ${isArchiving ? 'animate-pulse' : ''}`} />
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
            <Info className="h-4 w-4" />
          </button>
          {/* Archive info tooltip - positioned right on mobile to prevent cropping */}
          {showArchiveInfo && (
            <div className="fixed bottom-20 left-4 right-4 sm:absolute sm:bottom-full sm:left-auto sm:right-0 sm:mb-2 sm:w-72 p-3 bg-neutral-800 border border-neutral-700 rounded-lg shadow-xl z-50 text-left">
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
              {/* Arrow - only show on desktop */}
              <div className="hidden sm:block absolute top-full right-4 border-8 border-transparent border-t-neutral-800" />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
