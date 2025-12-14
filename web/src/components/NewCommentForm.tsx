import { ApolloCache, FetchResult } from '@apollo/client'
import { Form, Formik, FormikHelpers, FormikProps } from 'formik'
import { useMe } from 'hooks/useMe'
import { Send } from 'icons/Send'
import { useRouter } from 'next/router'
import * as yup from 'yup'
import { AddCommentMutation, CommentDocument, useAddCommentMutation } from '../lib/graphql'
import { Avatar } from 'components/Avatar'
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
  const pickerRef = useRef<HTMLDivElement>(null)
  const [addComment] = useAddCommentMutation({
    update: (cache, result) => {
      if (router.pathname === '/posts/[id]' && !router.query.cursor) {
        updateCache(cache, result)
      } else {
        cache.evict({ fieldName: 'comments', args: { postId } })
      }
    },
  })

  const handleSubmit = async ({ body }: FormValues, { resetForm }: FormikHelpers<FormValues>) => {
    await addComment({ variables: { input: { postId, body } } })

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

  if (!me) return null

  return (
    <Formik initialValues={initialValues} validationSchema={validationSchema} onSubmit={handleSubmit}>
      {({ isSubmitting, isValid, dirty, values }: FormikProps<FormValues>) => {
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
            // Use Formik's setFieldValue to update the body
            const newBody = currentBody + emoji.native
            // Access setFieldValue from Formik context
            ;(document.getElementById('commentField') as HTMLTextAreaElement).value = newBody
            // Trigger a change event
            const event = new Event('input', { bubbles: true })
            ;(document.getElementById('commentField') as HTMLTextAreaElement).dispatchEvent(event)
          }
          setShowEmojiPicker(false)
        }

        const handleStickerSelect = (stickerUrl: string, stickerName: string) => {
          const currentBody = values.body || ''
          // Insert animated emote as markdown image
          const emoteMarkdown = ` ![emote:${stickerName}](${stickerUrl}) `
          if (currentBody.length + emoteMarkdown.length <= 160) {
            const textarea = document.getElementById('commentField') as HTMLTextAreaElement
            if (textarea) {
              textarea.value = currentBody + emoteMarkdown
              const event = new Event('input', { bubbles: true })
              textarea.dispatchEvent(event)
            }
          }
          setShowStickerPicker(false)
        }

        return (
          <Form>
            <div className="flex flex-col bg-gray-25">
              <div className="flex flex-row items-start space-x-3 p-3">
                <Avatar profile={me.profile} linkToProfile={false} />
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
