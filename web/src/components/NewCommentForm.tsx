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
}

interface FormValues {
  body: string
}

const validationSchema: yup.Schema<FormValues> = yup.object().shape({
  body: yup.string().required().max(160),
})

const initialValues: FormValues = { body: '' }

export const NewCommentForm = ({ postId }: NewCommentFormProps) => {
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
    update: (cache, result) => {
      if (router.pathname === '/posts/[id]' && !router.query.cursor) {
        updateCache(cache, result)
      } else {
        cache.evict({ fieldName: 'comments', args: { postId } })
      }
    },
  })

  const [guestAddComment] = useGuestAddCommentMutation({
    refetchQueries: ['Comments'],
  })

  const handleSubmit = async ({ body }: FormValues, { resetForm }: FormikHelpers<FormValues>) => {
    if (me) {
      await addComment({ variables: { input: { postId, body } } })
    } else if (guestWallet) {
      await guestAddComment({ variables: { input: { postId, body }, walletAddress: guestWallet } })
    } else {
      // Anonymous comment - generate a random wallet address like public posts
      const hexChars = '0123456789abcdef'
      let addressBody = ''
      for (let i = 0; i < 40; i++) {
        addressBody += hexChars[Math.floor(Math.random() * 16)]
      }
      const anonymousAddress = `0x${addressBody}`
      await guestAddComment({ variables: { input: { postId, body }, walletAddress: anonymousAddress } })
    }

    if (router.query.commentId) {
      router.replace({ pathname: '/posts/[id]', query: { id: postId } }, `/posts/${postId}`, {
        shallow: true,
      })
    } else {
      resetForm()
      setLinkPreview(undefined)
    }

    document.querySelector('#main')?.scrollTo(0, 0)
  }

  // Allow commenting for everyone - logged in users, guests with wallet, or anonymous
  const isGuest = !me && !!guestWallet
  const isAnonymous = !me && !guestWallet

  return (
    <Formik initialValues={initialValues} validationSchema={validationSchema} onSubmit={handleSubmit}>
      {({ isSubmitting, isValid, dirty, values, setFieldValue }: FormikProps<FormValues>) => {
        // Detect and normalize links in comment body
        useEffect(() => {
          const detectLink = async () => {
            if (hasLink(values.body)) {
              const normalizedLink = await getNormalizedLink(values.body)
              setLinkPreview(normalizedLink)
            } else {
              setLinkPreview(undefined)
            }
          }
          detectLink()
        }, [values.body])

        const handleEmojiSelect = (emoji: Emoji) => {
          const currentBody = values.body || ''
          if (currentBody.length < 160) {
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
          if (currentBody.length + emoteMarkdown.length <= 160) {
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
                  <FlexareaField id="commentField" name="body" maxLength={160} placeholder="Write a comment..." />
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
                    <span className="text-xs text-gray-500 ml-auto">{values.body?.length || 0}/160</span>
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
                <button type="submit" disabled={isSubmitting} className="pt-1">
                  <Send color={dirty && isValid ? 'green-blue' : undefined} />
                </button>
              </div>
              {linkPreview && (() => {
                const mediaSource = IdentifySource(linkPreview)
                const mediaType = mediaSource.type

                // Platform-specific thumbnail rendering (no autoplay)
                if (mediaType === MediaProvider.YOUTUBE) {
                  return (
                    <div className="px-3 pb-3">
                      <iframe
                        className="w-full bg-gray-20"
                        style={{ height: '300px', minHeight: '300px' }}
                        frameBorder="0"
                        src={linkPreview}
                        title="Link preview"
                        allow="encrypted-media; gyroscope; picture-in-picture"
                      />
                    </div>
                  )
                }

                if (mediaType === MediaProvider.VIMEO) {
                  return (
                    <div className="px-3 pb-3">
                      <iframe
                        className="w-full bg-gray-20"
                        style={{ height: '300px', minHeight: '300px' }}
                        frameBorder="0"
                        src={linkPreview}
                        title="Link preview"
                        allow="fullscreen; picture-in-picture"
                      />
                    </div>
                  )
                }

                if (mediaType === MediaProvider.INSTAGRAM) {
                  return (
                    <div className="px-3 pb-3">
                      <iframe
                        className="w-full bg-gray-20"
                        style={{ height: '400px', minHeight: '400px' }}
                        frameBorder="0"
                        scrolling="no"
                        src={linkPreview}
                        title="Link preview"
                      />
                    </div>
                  )
                }

                if (mediaType === MediaProvider.TIKTOK) {
                  return (
                    <div className="px-3 pb-3">
                      <iframe
                        className="w-full bg-gray-20"
                        style={{ height: '400px', minHeight: '400px' }}
                        frameBorder="0"
                        scrolling="no"
                        src={linkPreview}
                        title="Link preview"
                      />
                    </div>
                  )
                }

                if (mediaType === MediaProvider.X) {
                  return (
                    <div className="px-3 pb-3">
                      <iframe
                        className="w-full bg-gray-20"
                        style={{ height: '400px', minHeight: '400px' }}
                        frameBorder="0"
                        scrolling="no"
                        src={linkPreview}
                        title="Link preview"
                      />
                    </div>
                  )
                }

                if (mediaType === MediaProvider.SOUNDCLOUD || mediaType === MediaProvider.SPOTIFY) {
                  return (
                    <div className="px-3 pb-3">
                      <iframe
                        className="w-full bg-gray-20"
                        style={{ height: '150px', minHeight: '150px' }}
                        frameBorder="0"
                        src={linkPreview}
                        title="Link preview"
                        allow="encrypted-media"
                      />
                    </div>
                  )
                }

                // Default thumbnail for other links
                return (
                  <div className="px-3 pb-3">
                    <div className="rounded bg-gray-20 p-3 text-sm text-gray-100">
                      <div className="font-bold mb-1">Link Preview:</div>
                      <a href={linkPreview} target="_blank" rel="noopener noreferrer" className="text-blue-400 underline break-all">
                        {linkPreview}
                      </a>
                    </div>
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
