import { ApolloCache, FetchResult } from '@apollo/client'
import { Form, Formik, FormikHelpers, FormikProps } from 'formik'
import { useMe } from 'hooks/useMe'
import { Send } from 'icons/Send'
import { useRouter } from 'next/router'
import * as yup from 'yup'
import { AddCommentMutation, CommentDocument, useAddCommentMutation } from '../lib/graphql'
import { Avatar } from 'components/Avatar'
import { FlexareaField } from './FlexareaField'
import { useEffect, useState } from 'react'
import { getNormalizedLink, IdentifySource, hasLink } from 'utils/NormalizeEmbedLinks'
import { MediaProvider } from 'types/MediaProvider'

export interface NewCommentFormProps {
  postId: string
}

interface FormValues {
  body: string
}

const validationSchema: yup.SchemaOf<FormValues> = yup.object().shape({
  body: yup.string().required().max(160),
})

const initialValues: FormValues = { body: '' }

export const NewCommentForm = ({ postId }: NewCommentFormProps) => {
  const me = useMe()
  const router = useRouter()
  const [linkPreview, setLinkPreview] = useState<string | undefined>(undefined)
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

        return (
          <Form placeholder="" onPointerEnterCapture={() => {}} onPointerLeaveCapture={() => {}}>
            <div className="flex flex-col bg-gray-25">
              <div className="flex flex-row items-start space-x-3 p-3">
                <Avatar profile={me.profile} linkToProfile={false} />
                <FlexareaField id="commentField" name="body" maxLength={160} placeholder="Write a comment..." />
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
