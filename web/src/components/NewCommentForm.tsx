import { ApolloCache, FetchResult } from '@apollo/client'
import { useMe } from 'hooks/useMe'
import { useRouter } from 'next/router'
import { AddCommentMutation, CommentDocument, useAddCommentMutation, useGuestAddCommentMutation, ReactionType, useBookmarkPostMutation, useUnbookmarkPostMutation } from '../lib/graphql'
import { Avatar } from 'components/Avatar'
import { GuestAvatar } from 'components/GuestAvatar'
import { StickerPicker } from './StickerPicker'
import { GifPicker } from './GifPicker'
import Picker from '@emoji-mart/react'
import { useEffect, useState, useRef, useCallback } from 'react'
import { getNormalizedLink, IdentifySource, hasLink } from 'utils/NormalizeEmbedLinks'
import { MediaProvider } from 'types/MediaProvider'
import { Smile, Sparkles, Link2, Send, X, Film, Video, Bookmark, ArrowDownToLine, Share2 } from 'lucide-react'
import { HandThumbUpIcon } from '@heroicons/react/24/outline'
import { ReactionSelector } from 'components/ReactionSelector'
import { ReactionEmoji } from 'icons/ReactionEmoji'
import { createPostArchive, downloadArchive, generateArchiveFilename, isMobileDevice } from 'lib/postArchive'
import { toast } from 'react-toastify'
import { CreateStoryModal } from './dex/CreateStoryModal'
import { SharePostModal } from './modals/SharePostModal'
import { createPortal } from 'react-dom'
import { MentionAutocomplete } from './MentionAutocomplete'

interface Emoji {
  id: string
  name: string
  native: string
  unified: string
  keywords: string[]
  shortcodes: string
}

export interface NewCommentFormProps {
  postId: string
  onSuccess?: () => void
  compact?: boolean
  inputRef?: React.RefObject<HTMLTextAreaElement>
  replyToCommentId?: string | null
  replyToName?: string | null
  onCancelReply?: () => void
  myReaction?: ReactionType | null
  isBookmarked?: boolean
  hasTrack?: boolean
  postData?: {
    id: string
    body: string | null
    createdAt: string
    uploadedMediaUrl?: string | null
    uploadedMediaType?: string | null
    mediaLink?: string | null
    mediaThumbnail?: string | null
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

export const NewCommentForm = ({ postId, onSuccess, compact, inputRef, replyToCommentId, replyToName, onCancelReply, myReaction, isBookmarked: initialIsBookmarked, hasTrack, postData }: NewCommentFormProps) => {
  const me = useMe()
  const router = useRouter()
  const [body, setBody] = useState('')
  const [reactionSelectorOpened, setReactionSelectorOpened] = useState(false)
  const [localIsBookmarked, setLocalIsBookmarked] = useState(initialIsBookmarked ?? false)
  const [isDownloading, setIsDownloading] = useState(false)
  const [selectedStickers, setSelectedStickers] = useState<Array<{url: string, name: string}>>([])
  const [embedUrl, setEmbedUrl] = useState('')
  const [linkPreview, setLinkPreview] = useState<string | undefined>(undefined)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [showStickerPicker, setShowStickerPicker] = useState(false)
  const [showGifPicker, setShowGifPicker] = useState(false)
  const [showEmbedInput, setShowEmbedInput] = useState(false)
  const [showStoryModal, setShowStoryModal] = useState(false)
  const [showShareModal, setShowShareModal] = useState(false)
  const [guestWallet, setGuestWallet] = useState<string | null>(null)
  const portalContainerRef = useRef<HTMLElement | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const pickerRef = useRef<HTMLDivElement>(null)
  const linkDetectionRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const internalInputRef = useRef<HTMLTextAreaElement>(null)
  const textareaRef = inputRef || internalInputRef
  const [cursorPosition, setCursorPosition] = useState(0)

  const handleMentionSelect = useCallback((handle: string) => {
    const textarea = textareaRef.current
    if (!textarea) return
    const before = body.slice(0, cursorPosition)
    const after = body.slice(cursorPosition)
    const mentionStart = before.lastIndexOf('@')
    if (mentionStart === -1) return
    const newBody = before.slice(0, mentionStart) + '@' + handle + ' ' + after
    setBody(newBody)
    const newCursor = mentionStart + handle.length + 2
    setCursorPosition(newCursor)
    requestAnimationFrame(() => {
      textarea.focus()
      textarea.setSelectionRange(newCursor, newCursor)
    })
  }, [body, cursorPosition, textareaRef])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      portalContainerRef.current = document.body
      if (!me) {
        const savedWallet = localStorage.getItem('connectedWalletAddress')
        if (savedWallet) setGuestWallet(savedWallet)
      }
    }
  }, [me])

  // Sync bookmark state with prop
  useEffect(() => {
    setLocalIsBookmarked(initialIsBookmarked ?? false)
  }, [initialIsBookmarked])

  // Bookmark mutations
  const [bookmarkPost, { loading: bookmarking }] = useBookmarkPostMutation()
  const [unbookmarkPost, { loading: unbookmarking }] = useUnbookmarkPostMutation()

  const handleBookmarkClick = async () => {
    if (!me) return
    if (bookmarking || unbookmarking) return
    try {
      if (localIsBookmarked) {
        await unbookmarkPost({ variables: { postId } })
        setLocalIsBookmarked(false)
        toast('Removed from bookmarks')
      } else {
        await bookmarkPost({ variables: { postId } })
        setLocalIsBookmarked(true)
        toast('Added to bookmarks')
      }
    } catch (err) {
      console.error('Bookmark error:', err)
      toast('Failed to update bookmark')
    }
  }

  const handleDownloadClick = async () => {
    if (!postData || isDownloading) return
    setIsDownloading(true)
    try {
      toast.info('Preparing download...', { autoClose: 2000 })
      const archiveBlob = await createPostArchive(postData)
      const filename = generateArchiveFilename(postData)
      const success = await downloadArchive(archiveBlob, filename, isMobileDevice())
      if (success) toast.success('Post downloaded!')
    } catch (err) {
      console.error('Download error:', err)
      toast.error('Failed to download')
    } finally {
      setIsDownloading(false)
    }
  }

  // Debounced link detection
  useEffect(() => {
    if (linkDetectionRef.current) clearTimeout(linkDetectionRef.current)
    linkDetectionRef.current = setTimeout(async () => {
      if (hasLink(body)) {
        const normalizedLink = await getNormalizedLink(body)
        setLinkPreview(normalizedLink)
      } else {
        setLinkPreview(undefined)
      }
    }, 500)
    return () => { if (linkDetectionRef.current) clearTimeout(linkDetectionRef.current) }
  }, [body])

  const [addComment] = useAddCommentMutation({
    refetchQueries: ['Comments', 'Comment'],
    awaitRefetchQueries: true,
    update: (cache, result) => {
      if (router.pathname === '/posts/[id]' && !router.query.cursor) {
        updateCache(cache, result)
      }
      // Only evict the specific post's comments, not ALL comments globally
      // Previous: cache.evict({ fieldName: 'comments' }) + cache.gc()
      // This was too aggressive — killed audio player state on every comment submit
    },
  })

  const [guestAddComment] = useGuestAddCommentMutation({
    refetchQueries: ['Comments', 'Comment'],
  })

  const handleSubmit = async () => {
    const hasContent = body.trim() || selectedStickers.length > 0 || embedUrl.trim()
    if (!hasContent || isSubmitting) return

    // Combine text and sticker markdown (same pattern as WaveformWithComments)
    const stickerMarkdown = selectedStickers
      .map(s => `![emote:${s.name}](${s.url})`)
      .join(' ')
    const finalBody = [body.trim(), stickerMarkdown, embedUrl.trim()].filter(Boolean).join(' ')

    setIsSubmitting(true)
    try {
      if (me) {
        await addComment({ variables: { input: { postId, body: finalBody, ...(replyToCommentId ? { replyToId: replyToCommentId } : {}) } } })
      } else if (guestWallet) {
        await guestAddComment({ variables: { input: { postId, body: finalBody, ...(replyToCommentId ? { replyToId: replyToCommentId } : {}) }, walletAddress: guestWallet } })
      } else {
        const hexChars = '0123456789abcdef'
        let addressBody = ''
        for (let i = 0; i < 40; i++) addressBody += hexChars[Math.floor(Math.random() * 16)]
        await guestAddComment({ variables: { input: { postId, body: finalBody }, walletAddress: `0x${addressBody}` } })
      }

      // Reset all state
      setBody('')
      setSelectedStickers([])
      setEmbedUrl('')
      setLinkPreview(undefined)
      setShowEmojiPicker(false)
      setShowStickerPicker(false)
      setShowGifPicker(false)
      setShowEmbedInput(false)

      if (router.query.commentId) {
        router.replace({ pathname: '/posts/[id]', query: { id: postId } }, `/posts/${postId}`, { shallow: true })
      }

      if (onSuccess) {
        onSuccess()
      } else {
        document.querySelector('#main')?.scrollTo(0, 0)
      }
    } catch (error: any) {
      console.error('[Comment] Error:', error)
      alert(`Comment failed: ${error.message || 'Unknown error'}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  const isGuest = !me && !!guestWallet
  const hasContent = body.trim() || selectedStickers.length > 0 || embedUrl.trim()

  const removeSticker = (index: number) => {
    setSelectedStickers(prev => prev.filter((_, i) => i !== index))
  }

  return (
    <>
    <div className={`flex flex-col ${compact ? '' : 'bg-gray-25'}`}>
      <div className={`flex flex-row items-start ${compact ? 'gap-2 p-0' : 'space-x-3 p-3'}`}>
        {me ? (
          <Avatar profile={me.profile} linkToProfile={false} pixels={compact ? 24 : undefined} className={compact ? 'w-6 h-6 flex-shrink-0' : ''} />
        ) : isGuest ? (
          <div className="flex items-center gap-2">
            <GuestAvatar walletAddress={guestWallet!} pixels={compact ? 24 : 40} className={compact ? 'w-6 h-6 flex-shrink-0' : ''} />
            {!compact && (
              <span className="text-[10px] px-1.5 py-0.5 bg-neutral-700 text-neutral-300 rounded-full font-medium">
                Guest
              </span>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <div className={`${compact ? 'w-6 h-6' : 'w-10 h-10'} rounded-full bg-neutral-700 flex items-center justify-center text-neutral-400`}>
              <span className={compact ? 'text-[10px]' : ''}>?</span>
            </div>
            {!compact && (
              <span className="text-[10px] px-1.5 py-0.5 bg-neutral-700 text-neutral-300 rounded-full font-medium">
                Public
              </span>
            )}
          </div>
        )}
        <div className="flex-1 relative">
          {/* Selected Stickers Preview */}
          {selectedStickers.length > 0 && (
            <div className="mb-2 p-2 bg-neutral-800/50 rounded-xl border border-neutral-700">
              <div className="flex items-center gap-1 mb-1.5">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                <span className="text-[10px] text-neutral-400">Selected Stickers ({selectedStickers.length})</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {selectedStickers.map((sticker, idx) => {
                  const isGif = sticker.name.startsWith('gif:')
                  return (
                  <div key={idx} className="relative group">
                    <img
                      src={sticker.url}
                      alt={sticker.name}
                      className={isGif
                        ? 'w-16 h-16 object-contain rounded-xl bg-neutral-900/50 p-0.5'
                        : 'w-10 h-10 object-contain rounded-lg bg-neutral-900/50 p-0.5'}
                      title={isGif ? sticker.name.replace('gif:', '') : sticker.name}
                    />
                    <button
                      onClick={() => removeSticker(idx)}
                      className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-2.5 h-2.5 text-white" />
                    </button>
                  </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Reply indicator */}
          {replyToCommentId && (
            <div className="flex items-center gap-2 mb-1.5 px-1">
              <span className="text-[11px] text-cyan-400">
                Replying to {replyToName ? `@${replyToName}` : 'comment'}
              </span>
              <button
                onClick={onCancelReply}
                className="text-[10px] text-neutral-500 hover:text-neutral-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          )}

          {/* Text Input */}
          <div className="relative">
            <MentionAutocomplete
              text={body}
              cursorPosition={cursorPosition}
              onSelect={handleMentionSelect}
              inputRef={textareaRef}
            />
            <textarea
              ref={textareaRef}
              value={body}
              onChange={(e) => {
                setBody(e.target.value.slice(0, 500 - selectedStickers.length))
                setCursorPosition(e.target.selectionStart || 0)
              }}
              onSelect={(e) => setCursorPosition((e.target as HTMLTextAreaElement).selectionStart || 0)}
              placeholder="Write a comment..."
              className="w-full bg-neutral-800 border border-neutral-700 rounded-xl p-3 pr-12 text-white placeholder:text-neutral-500 resize-none focus:outline-none focus:border-cyan-500 transition-colors text-sm"
              rows={compact ? 1 : 2}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSubmit()
                }
              }}
            />
            <button
              onClick={handleSubmit}
              disabled={!hasContent || isSubmitting}
              className="absolute right-3 bottom-3 p-2 bg-cyan-500 hover:bg-cyan-600 disabled:bg-neutral-700 disabled:cursor-not-allowed rounded-lg transition-colors"
            >
              {isSubmitting ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Send className="w-4 h-4 text-white" />
              )}
            </button>
          </div>

          {/* Action bar: Emoji, Stickers, Embed, character count */}
          <div className="flex items-center justify-between mt-2 gap-2">
            <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide">
              {/* Emoji button */}
              <button
                type="button"
                onClick={() => {
                  setShowEmojiPicker(!showEmojiPicker)
                  setShowStickerPicker(false)
                  setShowGifPicker(false)
                  setShowEmbedInput(false)
                }}
                className={`p-1.5 rounded-lg transition-all flex items-center gap-1 ${
                  showEmojiPicker
                    ? 'bg-gradient-to-r from-yellow-500/20 to-orange-500/20 text-yellow-400 ring-2 ring-yellow-400'
                    : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700 hover:text-white'
                }`}
                title="Add emoji"
              >
                <Smile className="w-4 h-4" />
                <span className="text-[10px] font-medium hidden sm:inline">Emoji</span>
              </button>

              {/* Sticker button */}
              <button
                type="button"
                onClick={() => {
                  setShowStickerPicker(!showStickerPicker)
                  setShowEmojiPicker(false)
                  setShowGifPicker(false)
                  setShowEmbedInput(false)
                }}
                className={`p-1.5 rounded-lg transition-all flex items-center gap-1 ${
                  showStickerPicker
                    ? 'bg-gradient-to-r from-cyan-500/20 to-purple-500/20 text-cyan-400 ring-2 ring-cyan-400'
                    : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700 hover:text-white'
                }`}
                title="Add stickers (7TV, BTTV, FFZ)"
              >
                <Sparkles className="w-4 h-4" />
                <span className="text-[10px] font-medium hidden sm:inline">Stickers</span>
              </button>

              {/* GIF button */}
              <button
                type="button"
                onClick={() => {
                  setShowGifPicker(!showGifPicker)
                  setShowEmojiPicker(false)
                  setShowStickerPicker(false)
                  setShowEmbedInput(false)
                }}
                className={`p-1.5 rounded-lg transition-all flex items-center gap-1 ${
                  showGifPicker
                    ? 'bg-gradient-to-r from-pink-500/20 to-rose-500/20 text-pink-400 ring-2 ring-pink-400'
                    : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700 hover:text-white'
                }`}
                title="Search GIFs (GIPHY)"
              >
                <Film className="w-4 h-4" />
                <span className="text-[10px] font-medium hidden sm:inline">GIF</span>
              </button>

              {/* Embed URL button */}
              <button
                type="button"
                onClick={() => {
                  setShowEmbedInput(!showEmbedInput)
                  setShowStickerPicker(false)
                  setShowEmojiPicker(false)
                  setShowGifPicker(false)
                }}
                className={`p-1.5 rounded-lg transition-all flex items-center gap-1 ${
                  showEmbedInput || embedUrl
                    ? 'bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-purple-400 ring-2 ring-purple-400'
                    : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700 hover:text-white'
                }`}
                title="Add embed URL (YouTube, Spotify, SoundCloud)"
              >
                <Link2 className="w-4 h-4" />
                <span className="text-[10px] font-medium hidden sm:inline">Embed</span>
              </button>

              {/* Story/Reel button */}
              <button
                type="button"
                onClick={() => setShowStoryModal(true)}
                className="p-1.5 rounded-lg transition-all flex items-center gap-1 bg-neutral-800 text-neutral-400 hover:bg-neutral-700 hover:text-cyan-400"
                title="Create Story / Reel"
              >
                <Video className="w-4 h-4" />
                <span className="text-[10px] font-medium hidden sm:inline">Reel</span>
              </button>

              {/* Share pill */}
              <button
                type="button"
                onClick={() => {
                  if (navigator.share && typeof navigator.share === 'function') {
                    const postUrl = `${window.location.origin}/posts/${postId}`
                    navigator.share({ title: 'SoundChain', text: postData?.body || 'Check this out!', url: postUrl }).catch(() => {
                      setShowShareModal(true)
                    })
                  } else {
                    setShowShareModal(true)
                  }
                }}
                className="p-1.5 rounded-lg transition-all flex items-center gap-1 bg-neutral-800 text-neutral-400 hover:bg-neutral-700 hover:text-cyan-400"
                title="Share"
              >
                <Share2 className="w-4 h-4" />
                <span className="text-[10px] font-medium hidden sm:inline">Share</span>
              </button>

              {/* Separator */}
              {(myReaction !== undefined) && (
                <div className="w-px h-5 bg-neutral-700 mx-0.5" />
              )}

              {/* Like pill */}
              {(myReaction !== undefined) && (
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setReactionSelectorOpened(!reactionSelectorOpened)}
                    className={`p-1.5 rounded-lg transition-all flex items-center gap-1 ${
                      myReaction
                        ? 'bg-gradient-to-r from-cyan-500/20 to-purple-500/20 text-cyan-400 ring-1 ring-cyan-400/50'
                        : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700 hover:text-white'
                    }`}
                    title="Like"
                  >
                    {myReaction ? (
                      <ReactionEmoji name={myReaction} className="w-4 h-4" />
                    ) : (
                      <HandThumbUpIcon className="w-4 h-4" />
                    )}
                    <span className="text-[10px] font-medium hidden sm:inline">Like</span>
                  </button>
                  {reactionSelectorOpened && (
                    <div className="absolute bottom-full left-0 mb-2 z-50">
                      <div className="bg-neutral-800 border border-neutral-700 rounded-xl p-2 shadow-xl shadow-black/50">
                        <ReactionSelector
                          postId={postId}
                          myReaction={myReaction ?? null}
                          opened={true}
                          setOpened={setReactionSelectorOpened}
                          isGuest={!me && !!guestWallet}
                          guestWallet={guestWallet}
                          inline
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Download pill — hide for NFT posts */}
              {!hasTrack && postData && (
                <button
                  type="button"
                  onClick={handleDownloadClick}
                  disabled={isDownloading}
                  className={`p-1.5 rounded-lg transition-all flex items-center gap-1 bg-neutral-800 text-neutral-400 hover:bg-neutral-700 hover:text-white ${isDownloading ? 'opacity-50' : ''}`}
                  title="Download"
                >
                  <ArrowDownToLine className={`w-4 h-4 ${isDownloading ? 'animate-pulse' : ''}`} />
                  <span className="text-[10px] font-medium hidden sm:inline">Save</span>
                </button>
              )}

              {/* Bookmark pill */}
              {me && (myReaction !== undefined) && (
                <button
                  type="button"
                  onClick={handleBookmarkClick}
                  disabled={bookmarking || unbookmarking}
                  className={`p-1.5 rounded-lg transition-all flex items-center gap-1 ${
                    localIsBookmarked
                      ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-400 ring-1 ring-cyan-400/50'
                      : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700 hover:text-white'
                  } ${bookmarking || unbookmarking ? 'opacity-50' : ''}`}
                  title={localIsBookmarked ? 'Remove bookmark' : 'Bookmark'}
                >
                  <Bookmark className={`w-4 h-4 ${localIsBookmarked ? 'fill-cyan-400' : ''}`} />
                  <span className="text-[10px] font-medium hidden sm:inline">Mark</span>
                </button>
              )}
            </div>

            <span className={`text-[10px] ${(body.length + selectedStickers.length) > 400 ? 'text-amber-400' : 'text-neutral-500'}`}>
              {body.length + selectedStickers.length}/500
            </span>
          </div>

          {/* Embed URL Input */}
          {showEmbedInput && (
            <div className="mt-2">
              <div className="bg-neutral-800 rounded-xl p-2.5 border border-neutral-700">
                <div className="flex items-center gap-2 mb-1.5">
                  <Link2 className="w-3.5 h-3.5 text-purple-400" />
                  <span className="text-[10px] text-neutral-400">Embed URL (YouTube, Spotify, SoundCloud, etc.)</span>
                </div>
                <input
                  type="url"
                  value={embedUrl}
                  onChange={(e) => setEmbedUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full bg-neutral-900 border border-neutral-600 rounded-lg px-3 py-1.5 text-xs text-white placeholder:text-neutral-500 focus:outline-none focus:border-purple-500 transition-colors"
                />
                {embedUrl && (
                  <div className="mt-1.5 flex items-center justify-between">
                    <span className="text-[10px] text-green-400">URL attached</span>
                    <button
                      onClick={() => setEmbedUrl('')}
                      className="text-[10px] text-red-400 hover:text-red-300"
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Emoji Picker - stays open for emoji flurries */}
          {showEmojiPicker && (
            <div ref={pickerRef} className="mt-2" onClick={(e) => e.stopPropagation()} onTouchEnd={(e) => e.stopPropagation()}>
              <Picker
                theme="dark"
                perLine={8}
                onEmojiSelect={(emoji: Emoji) => {
                  if (body.length < 500) {
                    setBody(prev => prev + emoji.native)
                  }
                }}
                onClickOutside={() => setShowEmojiPicker(false)}
              />
            </div>
          )}

          {/* Sticker Picker - 7TV, BTTV, FFZ emotes - stays open for flurry blasts */}
          {showStickerPicker && (
            <div className="mt-2" onClick={(e) => e.stopPropagation()} onTouchEnd={(e) => e.stopPropagation()}>
              <StickerPicker
                theme="dark"
                onClose={() => setShowStickerPicker(false)}
                onSelect={(stickerUrl, stickerName) => {
                  setSelectedStickers(prev => [...prev, { url: stickerUrl, name: stickerName }])
                }}
              />
            </div>
          )}

          {/* GIF Picker - GIPHY search */}
          {showGifPicker && (
            <div className="mt-2" onClick={(e) => e.stopPropagation()} onTouchEnd={(e) => e.stopPropagation()}>
              <GifPicker
                theme="dark"
                onClose={() => setShowGifPicker(false)}
                onSelect={(gifUrl, gifTitle) => {
                  setSelectedStickers(prev => [...prev, { url: gifUrl, name: `gif:${gifTitle}` }])
                }}
              />
            </div>
          )}

          {/* Create Story Modal */}
          {showStoryModal && (
            <CreateStoryModal
              isOpen={showStoryModal}
              onClose={() => setShowStoryModal(false)}
            />
          )}
        </div>
      </div>

      {/* Link preview */}
      {linkPreview && (() => {
        const mediaSource = IdentifySource(linkPreview)
        const mediaType = mediaSource.type

        const platformName = mediaType === MediaProvider.BANDCAMP ? 'Bandcamp' :
                            mediaType === MediaProvider.SPOTIFY ? 'Spotify' :
                            mediaType === MediaProvider.SOUNDCLOUD ? 'SoundCloud' :
                            mediaType === MediaProvider.YOUTUBE ? 'YouTube' :
                            mediaType === MediaProvider.VIMEO ? 'Vimeo' :
                            mediaType === MediaProvider.INSTAGRAM ? 'Instagram' :
                            mediaType === MediaProvider.TIKTOK ? 'TikTok' :
                            mediaType === MediaProvider.X ? 'X' :
                            mediaType === MediaProvider.TWITCH ? 'Twitch' : 'Link'
        const platformIcon = mediaType === MediaProvider.BANDCAMP ? '💿' :
                            mediaType === MediaProvider.SPOTIFY ? '🎵' :
                            mediaType === MediaProvider.SOUNDCLOUD ? '☁️' :
                            mediaType === MediaProvider.YOUTUBE ? '▶️' :
                            mediaType === MediaProvider.VIMEO ? '🎬' :
                            mediaType === MediaProvider.INSTAGRAM ? '📸' :
                            mediaType === MediaProvider.TIKTOK ? '🎭' :
                            mediaType === MediaProvider.X ? '𝕏' :
                            mediaType === MediaProvider.TWITCH ? '🎮' : '🔗'

        return (
          <div className="px-3 pb-3">
            <a
              href={linkPreview}
              target="_blank"
              rel="noopener noreferrer"
              className="block p-3 bg-neutral-800 hover:bg-neutral-700 rounded-lg transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{platformIcon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-semibold text-sm">{platformName} link</p>
                  <p className="text-neutral-400 text-xs truncate">{linkPreview}</p>
                </div>
                <span className="text-cyan-400 text-sm">&rarr;</span>
              </div>
            </a>
          </div>
        )
      })()}
    </div>

    {/* Share Post Modal (DM share + copy link + story) */}
    {portalContainerRef.current && showShareModal && createPortal(
      <SharePostModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        postId={postId}
        postBody={postData?.body}
        onShareToStory={me && postData && (postData.uploadedMediaUrl || postData.mediaThumbnail || postData.mediaLink) ? () => { setShowShareModal(false); setShowStoryModal(true) } : undefined}
      />,
      portalContainerRef.current
    )}
    </>
  )
}

function updateCache(cache: ApolloCache<AddCommentMutation>, { data }: FetchResult) {
  const newComment = data?.addComment.comment

  cache.writeQuery({
    query: CommentDocument,
    variables: { id: newComment.id },
    data: { comment: newComment },
  })

  cache.modify({
    fields: {
      comments({ nodes, pageInfo }, {}) {
        const newNode = { __ref: cache.identify(newComment) }
        return {
          nodes: [newNode, ...nodes],
          pageInfo,
        }
      },
    },
  })
}
