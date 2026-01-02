import { ApolloCache, FetchResult } from '@apollo/client'
import { Form, Formik, FormikHelpers, FormikProps } from 'formik'
import { useMe } from 'hooks/useMe'
import { Send } from 'icons/Send'
import { useRouter } from 'next/router'
import * as yup from 'yup'
import { AddCommentMutation, CommentDocument, useAddCommentMutation, useGuestAddCommentMutation } from '../lib/graphql'
import { Avatar } from 'components/Avatar'
import { GuestAvatar, formatWalletAddress } from 'components/GuestAvatar'
import { FlexareaField } from './FlexareaField'
import { StickerPicker } from './StickerPicker'
import Picker from '@emoji-mart/react'
import { useEffect, useState, useRef } from 'react'
import { getNormalizedLink, IdentifySource, hasLink } from 'utils/NormalizeEmbedLinks'
import { MediaProvider } from 'types/MediaProvider'

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

interface FormValues {
  body: string
}

const validationSchema: yup.Schema<FormValues> = yup.object().shape({
  body: yup.string().required().max(500),
})

const initialValues: FormValues = { body: '' }

export const NewCommentForm = ({ postId, onSuccess, compact }: NewCommentFormProps) => {
  const me = useMe()
  const router = useRouter()
  const [linkPreview, setLinkPreview] = useState<string | undefined>(undefined)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [showStickerPicker, setShowStickerPicker] = useState(false)
  const [guestWallet, setGuestWallet] = useState<string | null>(null)
  const pickerRef = useRef<HTMLDivElement>(null)

  // Check for guest wallet on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && !me) {
      const savedWallet = localStorage.getItem('connectedWalletAddress')
      if (savedWallet) {
        setGuestWallet(savedWallet)
      }
    }
  }, [me])

  const [addComment] = useAddCommentMutation({
    refetchQueries: ['Comments'], // Always refetch comments after adding
    awaitRefetchQueries: true,
    update: (cache, result) => {
      if (router.pathname === '/posts/[id]' && !router.query.cursor) {
        updateCache(cache, result)
      }
      // Evict the comments cache to force refresh
      cache.evict({ fieldName: 'comments' })
      cache.gc()
    },
  })

  const [guestAddComment] = useGuestAddCommentMutation({
    refetchQueries: ['Comments'],
  })

  const handleSubmit = async ({ body }: FormValues, { resetForm }: FormikHelpers<FormValues>) => {
    console.log('[Comment] Submitting comment:', { postId, body, me: !!me, guestWallet })
    try {
      if (me) {
        console.log('[Comment] Adding comment as logged-in user')
        const result = await addComment({ variables: { input: { postId, body } } })
        console.log('[Comment] Result:', result)
      } else if (guestWallet) {
        console.log('[Comment] Adding comment as guest')
        await guestAddComment({ variables: { input: { postId, body }, walletAddress: guestWallet } })
      } else {
        // Anonymous comment - generate a random wallet address like public posts
        console.log('[Comment] Adding comment as anonymous')
        const hexChars = '0123456789abcdef'
        let addressBody = ''
        for (let i = 0; i < 40; i++) {
          addressBody += hexChars[Math.floor(Math.random() * 16)]
        }
        const anonymousAddress = `0x${addressBody}`
        await guestAddComment({ variables: { input: { postId, body }, walletAddress: anonymousAddress } })
      }

      console.log('[Comment] Success!')

      if (router.query.commentId) {
        router.replace({ pathname: '/posts/[id]', query: { id: postId } }, `/posts/${postId}`, {
          shallow: true,
        })
      } else {
        resetForm()
        setLinkPreview(undefined)
      }

      // Call onSuccess callback if provided (for modal usage)
      if (onSuccess) {
        onSuccess()
      } else {
        document.querySelector('#main')?.scrollTo(0, 0)
      }
    } catch (error: any) {
      console.error('[Comment] Error:', error)
      alert(`Comment failed: ${error.message || 'Unknown error'}`)
    }
  }

  // Allow commenting for everyone - logged in users, guests with wallet, or anonymous
  const isGuest = !me && !!guestWallet
  const isAnonymous = !me && !guestWallet

  // Use ref for debounced link detection
  const linkDetectionRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  return (
    <Formik initialValues={initialValues} validationSchema={validationSchema} onSubmit={handleSubmit}>
      {({ isSubmitting, isValid, dirty, values, setFieldValue }: FormikProps<FormValues>) => {
        // Debounced link detection - safe inside render prop as it uses refs
        if (linkDetectionRef.current) {
          clearTimeout(linkDetectionRef.current)
        }
        linkDetectionRef.current = setTimeout(async () => {
          if (hasLink(values.body)) {
            const normalizedLink = await getNormalizedLink(values.body)
            setLinkPreview(normalizedLink)
          } else {
            setLinkPreview(undefined)
          }
        }, 500)

        const handleEmojiSelect = (emoji: Emoji) => {
          const currentBody = values.body || ''
          if (currentBody.length < 500) {
            const newBody = currentBody + emoji.native
            // Use Formik's setFieldValue to properly update form state
            setFieldValue('body', newBody)
          }
          // Don't close picker - allow emoji flurries!
        }

        const handleStickerSelect = (stickerUrl: string, stickerName: string) => {
          const currentBody = values.body || ''
          // Insert animated emote as markdown image
          const emoteMarkdown = `![emote:${stickerName}](${stickerUrl})`
          if (currentBody.length + emoteMarkdown.length <= 500) {
            // Use Formik's setFieldValue to properly update form state
            setFieldValue('body', currentBody + emoteMarkdown)
          }
          // Don't close picker - allow sticker flurries!
        }

        return (
          <Form>
            <div className="flex flex-col bg-gray-25">
              <div className="flex flex-row items-start space-x-3 p-3">
                {me ? (
                  <Avatar profile={me.profile} linkToProfile={false} />
                ) : isGuest ? (
                  <div className="flex items-center gap-2">
                    <GuestAvatar walletAddress={guestWallet!} pixels={40} />
                    <span className="text-[8px] px-1.5 py-0.5 bg-cyan-500/20 text-cyan-400 rounded-full font-medium">
                      Guest
                    </span>
                  </div>
                ) : (
                  // Anonymous user - show generic avatar
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-full bg-neutral-700 flex items-center justify-center text-neutral-400">
                      👤
                    </div>
                    <span className="text-[8px] px-1.5 py-0.5 bg-neutral-600 text-neutral-300 rounded-full font-medium">
                      Public
                    </span>
                  </div>
                )}
                <div className="flex-1 relative">
                  <FlexareaField id="commentField" name="body" maxLength={500} placeholder="Write a comment..." />
                  {/* Emoji/Sticker toolbar */}
                  <div className="flex items-center gap-2 mt-1">
                    <button
                      type="button"
                      onClick={() => { setShowEmojiPicker(!showEmojiPicker); setShowStickerPicker(false) }}
                      className="text-lg hover:scale-110 transition-transform"
                      title="Add emoji"
                    >
                      {showEmojiPicker ? '❌' : '😊'}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setShowStickerPicker(!showStickerPicker); setShowEmojiPicker(false) }}
                      className="text-lg hover:scale-110 transition-transform"
                      title="Add sticker"
                    >
                      {showStickerPicker ? '❌' : '🎵'}
                    </button>
                    <span className="text-xs text-gray-500 ml-auto">{values.body?.length || 0}/500</span>
                  </div>
                  {/* Emoji Picker Dropdown */}
                  {showEmojiPicker && (
                    <div ref={pickerRef} className="absolute left-0 bottom-12 z-50">
                      <Picker theme="dark" perLine={8} onEmojiSelect={handleEmojiSelect} />
                    </div>
                  )}
                  {/* Sticker Picker Dropdown */}
                  {showStickerPicker && (
                    <div className="absolute left-0 bottom-12 z-50">
                      <StickerPicker theme="dark" onSelect={handleStickerSelect} />
                    </div>
                  )}
                </div>
                <button
                  type="submit"
                  disabled={isSubmitting || !dirty || !isValid}
                  className={`pt-1 transition-opacity ${isSubmitting ? 'opacity-50' : ''}`}
                >
                  {isSubmitting ? (
                    <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Send color={dirty && isValid ? 'green-blue' : undefined} />
                  )}
                </button>
              </div>
              {linkPreview && (() => {
                const mediaSource = IdentifySource(linkPreview)
                const mediaType = mediaSource.type

                // Platform name and icon
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

                // Show link card for all platforms
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
                        <span className="text-cyan-400 text-sm">→</span>
                      </div>
                    </a>
                  </div>
                )
              })()}
            </div>
          </Form>
        )
      }}
    </Formik>
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
