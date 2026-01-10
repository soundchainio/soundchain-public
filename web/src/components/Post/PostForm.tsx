import { useModalState } from 'contexts/ModalContext'
import { Form, Formik, FormikHelpers } from 'formik'
import {
  CreatePostInput,
  UpdatePostInput,
  useCreatePostMutation,
  useCreateRepostMutation,
  useTrackLazyQuery,
  useUpdatePostMutation,
} from 'lib/graphql'
import { useEffect, useState } from 'react'
import { PostFormType } from 'types/PostFormType'
import { MediaProvider } from 'types/MediaProvider'
import { toast } from 'react-toastify'
import * as yup from 'yup'
import { IdentifySource } from 'utils/NormalizeEmbedLinks'
import { Button } from '../common/Buttons/Button'
import { MiniAudioPlayer } from '../MiniAudioPlayer'
import { PostBar } from './PostBar'
import { PostBodyField } from './PostBodyField'
import { setMaxInputLength } from './PostModal'
import { RepostPreview } from './RepostPreview'

interface InitialValues {
  body: string
}

interface PostFormProps {
  type: PostFormType
  initialValues: InitialValues
  postLink?: string
  originalLink?: string
  afterSubmit: () => void
  onCancel: (setFieldValue: (field: string, value: string) => void) => void
  showNewPost: boolean
  setOriginalLink: (val: string) => void
  setPostLink: (val: string) => void
  setBodyValue: (val: string) => void
  trackId?: string
}

export interface FormValues {
  body: string
  mediaLink?: string
}

// Base schema - body is optional for reposts
const postSchema: yup.Schema<FormValues> = yup.object().shape({
  body: yup.string().default(''),
  mediaLink: yup.string(),
})

// Schema for new posts and edits - body is required
const newPostSchema: yup.Schema<FormValues> = yup.object().shape({
  body: yup.string().required('Post body is required'),
  mediaLink: yup.string(),
})

const defaultInitialValues = { body: '' }

export const PostForm = ({ ...props }: PostFormProps) => {
  const [isEmojiPickerVisible, setEmojiPickerVisible] = useState(false)
  const [createPost] = useCreatePostMutation({ refetchQueries: ['Posts', 'Feed'] })
  const [createRepost] = useCreateRepostMutation({ refetchQueries: ['Posts', 'Feed'] })
  const [editPost] = useUpdatePostMutation()
  const [getTrack, { data: track }] = useTrackLazyQuery()
  const { repostId, editPostId } = useModalState()

  useEffect(() => {
    if (props.trackId) getTrack({ variables: { id: props.trackId } })
  }, [getTrack, props.trackId])

  const onEmojiPickerClick = () => {
    setEmojiPickerVisible(!isEmojiPickerVisible)
  }

  const onSubmit = async (values: FormValues, { resetForm }: FormikHelpers<FormValues>) => {
    try {
      switch (props.type) {
        case PostFormType.REPOST:
          await createRepost({ variables: { input: { body: values.body || '', repostId: repostId as string } } })
          toast.success('Reposted successfully!')
          break
        case PostFormType.EDIT:
          const updateParams: UpdatePostInput = { body: values.body, postId: editPostId as string }

          if (props.postLink?.length) {
            updateParams.mediaLink = props.postLink
          }

          await editPost({ variables: { input: updateParams } })
          toast.success('Post updated!')
          break
        case PostFormType.NEW:
          const newPostParams: CreatePostInput = { body: values.body }

          if (props.postLink?.length) {
            newPostParams.mediaLink = props.postLink
            // Send original URL for oEmbed thumbnail lookups (SoundCloud, etc.)
            if (props.originalLink?.length) {
              newPostParams.originalMediaLink = props.originalLink
            }
          }

          if (props.trackId) {
            newPostParams.trackId = props.trackId
          }

          await createPost({ variables: { input: newPostParams } })
          toast.success('Post created!')
      }

      resetForm()
      props.afterSubmit()
    } catch (error: any) {
      console.error('Post submission error:', error)
      toast.error(error?.message || 'Failed to submit post. Please try again.')
    }
  }

  const onTextAreaChange = (newVal: string) => {
    props.setBodyValue(newVal)
  }
  // Use different validation based on post type - reposts don't require body text
  const validationSchema = props.type === PostFormType.REPOST ? postSchema : newPostSchema

  return (
    <Formik
      enableReinitialize={true}
      initialValues={props.initialValues || defaultInitialValues}
      validationSchema={validationSchema}
      onSubmit={onSubmit}
    >
      {({ values, setFieldValue }) => (
        <Form className="pb-safe flex h-full flex-col">
          <div className="flex items-center rounded-tl-3xl rounded-tr-3xl bg-gray-20">
            <button
              className="flex-1 p-2 text-center font-bold text-gray-400"
              onClick={() => props.onCancel(setFieldValue)}
            >
              Cancel
            </button>
            <div className="flex-1 text-center font-bold text-white">
              {props.type === PostFormType.REPOST && 'Repost'}
              {props.type === PostFormType.EDIT && 'Edit Post'}
              {props.type === PostFormType.NEW && 'New Post'}
            </div>
            <div className="m-2 flex-1 text-center">
              <div className="ml-6">
                <Button className="bg-gray-30 text-sm " type="submit" variant="rainbow-rounded">
                  {props.type === PostFormType.EDIT && 'Save'}
                  {props.type !== PostFormType.EDIT && 'Post'}
                </Button>
              </div>
            </div>
          </div>
          <PostBodyField
            name="body"
            placeholder="What's happening?"
            maxLength={setMaxInputLength(values.body)}
            updatedValue={onTextAreaChange}
          />
          {props.type === PostFormType.REPOST && (
            <div className="bg-gray-20 p-4">
              <RepostPreview postId={repostId as string} />
            </div>
          )}
          {props.trackId && track && PostFormType.NEW && (
            <MiniAudioPlayer
              song={{
                src: track.track.playbackUrl,
                trackId: track.track.id,
                art: track.track.artworkUrl,
                title: track.track.title,
                artist: track.track.artist,
                isFavorite: track.track.isFavorite,
                playbackCount: track.track.playbackCountFormatted,
                favoriteCount: track.track.favoriteCount,
                saleType: track.track.saleType,
                price: track.track.price,
              }}
            />
          )}
          {/* Embed preview - Instagram 4:5 aspect ratio for polish */}
          {props.postLink && props.type !== PostFormType.REPOST && (() => {
            const mediaType = IdentifySource(props.postLink).type
            let embedUrl = props.postLink

            // Add autoplay/mute for video platforms in preview
            if (mediaType === MediaProvider.YOUTUBE || mediaType === MediaProvider.VIMEO) {
              try {
                const url = new URL(embedUrl)
                url.searchParams.set('autoplay', '1')
                url.searchParams.set('mute', '1')
                if (mediaType === MediaProvider.YOUTUBE) {
                  url.searchParams.set('modestbranding', '1')
                  url.searchParams.set('rel', '0')
                }
                embedUrl = url.toString()
              } catch {
                // URL parsing failed, use original
              }
            }

            return (
              <div
                className="relative w-full bg-black overflow-hidden"
                style={{
                  aspectRatio: '4/5',
                  contain: 'layout style',
                  willChange: 'contents',
                  transform: 'translateZ(0)',
                }}
              >
                <iframe
                  className="absolute inset-0 w-full h-full"
                  frameBorder="0"
                  allowFullScreen
                  src={embedUrl}
                  title="Media preview"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
                  sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-forms"
                />
              </div>
            )
          })()}
          <PostBar
            onEmojiPickerClick={onEmojiPickerClick}
            isEmojiPickerVisible={isEmojiPickerVisible}
            isRepost={props.type === PostFormType.REPOST}
            showNewPost={props.showNewPost}
            setOriginalLink={props.setOriginalLink}
            setFieldValue={setFieldValue}
            values={values}
            postLink={props.postLink || ''}
            setPostLink={props.setPostLink}
          />
        </Form>
      )}
    </Formik>
  )
}
