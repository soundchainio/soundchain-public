import { ApolloCache, FetchResult } from '@apollo/client'
import { useMe } from 'hooks/useMe'
import { useRouter } from 'next/router'
import { AddCommentMutation, CommentDocument, useAddCommentMutation, useGuestAddCommentMutation } from '../lib/graphql'
import { Avatar } from 'components/Avatar'
import { GuestAvatar } from 'components/GuestAvatar'
import { StickerPicker } from './StickerPicker'
import Picker from '@emoji-mart/react'
import { useEffect, useState, useRef } from 'react'
import { getNormalizedLink, IdentifySource, hasLink } from 'utils/NormalizeEmbedLinks'
import { MediaProvider } from 'types/MediaProvider'
import { Smile, Sparkles, Link2, Send, X } from 'lucide-react'

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
}

export const NewCommentForm = ({ postId, onSuccess, compact }: NewCommentFormProps) => {
  const me = useMe()
  const router = useRouter()
  const [body, setBody] = useState('')
  const [selectedStickers, setSelectedStickers] = useState<Array<{url: string, name: string}>>([])
  const [embedUrl, setEmbedUrl] = useState('')
  const [linkPreview, setLinkPreview] = useState<string | undefined>(undefined)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [showStickerPicker, setShowStickerPicker] = useState(false)
  const [showEmbedInput, setShowEmbedInput] = useState(false)
  const [guestWallet, setGuestWallet] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const pickerRef = useRef<HTMLDivElement>(null)
  const linkDetectionRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (typeof window !== 'undefined' && !me) {
      const savedWallet = localStorage.getItem('connectedWalletAddress')
      if (savedWallet) setGuestWallet(savedWallet)
    }
  }, [me])

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
    refetchQueries: ['Comments'],
    awaitRefetchQueries: true,
    update: (cache, result) => {
      if (router.pathname === '/posts/[id]' && !router.query.cursor) {
        updateCache(cache, result)
      }
      cache.evict({ fieldName: 'comments' })
      cache.gc()
    },
  })

  const [guestAddComment] = useGuestAddCommentMutation({
    refetchQueries: ['Comments'],
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
        await addComment({ variables: { input: { postId, body: finalBody } } })
      } else if (guestWallet) {
        await guestAddComment({ variables: { input: { postId, body: finalBody }, walletAddress: guestWallet } })
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
    <div className="flex flex-col bg-gray-25">
      <div className="flex flex-row items-start space-x-3 p-3">
        {me ? (
          <Avatar profile={me.profile} linkToProfile={false} />
        ) : isGuest ? (
          <div className="flex items-center gap-2">
            <GuestAvatar walletAddress={guestWallet!} pixels={40} />
            <span className="text-[10px] px-1.5 py-0.5 bg-neutral-700 text-neutral-300 rounded-full font-medium">
              Guest
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-neutral-700 flex items-center justify-center text-neutral-400">
              <span>?</span>
            </div>
            <span className="text-[10px] px-1.5 py-0.5 bg-neutral-700 text-neutral-300 rounded-full font-medium">
              Public
            </span>
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
                {selectedStickers.map((sticker, idx) => (
                  <div key={idx} className="relative group">
                    <img
                      src={sticker.url}
                      alt={sticker.name}
                      className="w-10 h-10 object-contain rounded-lg bg-neutral-900/50 p-0.5"
                      title={sticker.name}
                    />
                    <button
                      onClick={() => removeSticker(idx)}
                      className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-2.5 h-2.5 text-white" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Text Input */}
          <div className="relative">
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value.slice(0, 500 - selectedStickers.length))}
              placeholder="Write a comment..."
              className="w-full bg-neutral-800 border border-neutral-700 rounded-xl p-3 pr-12 text-white placeholder:text-neutral-500 resize-none focus:outline-none focus:border-cyan-500 transition-colors text-sm"
              rows={2}
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
            <div className="flex items-center gap-1.5">
              {/* Emoji button */}
              <button
                type="button"
                onClick={() => {
                  setShowEmojiPicker(!showEmojiPicker)
                  setShowStickerPicker(false)
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

              {/* Embed URL button */}
              <button
                type="button"
                onClick={() => {
                  setShowEmbedInput(!showEmbedInput)
                  setShowStickerPicker(false)
                  setShowEmojiPicker(false)
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
              />
            </div>
          )}

          {/* Sticker Picker - 7TV, BTTV, FFZ emotes - stays open for flurry blasts */}
          {showStickerPicker && (
            <div className="mt-2" onClick={(e) => e.stopPropagation()} onTouchEnd={(e) => e.stopPropagation()}>
              <StickerPicker
                theme="dark"
                onSelect={(stickerUrl, stickerName) => {
                  setSelectedStickers(prev => [...prev, { url: stickerUrl, name: stickerName }])
                }}
              />
            </div>
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
