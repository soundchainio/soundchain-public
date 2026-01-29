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
        <Form className="pb-safe flex flex-col">
          {/* Header - dark styling with inline style for guaranteed visibility */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-800" style={{ backgroundColor: '#171717' }}>
            <button
              type="button"
              className="text-neutral-400 hover:text-white font-medium text-sm transition-colors"
              onClick={() => props.onCancel(setFieldValue)}
            >
              Cancel
            </button>
            <span className="text-white font-semibold text-sm">
              {props.type === PostFormType.REPOST && 'Repost'}
              {props.type === PostFormType.EDIT && 'Edit Post'}
              {props.type === PostFormType.NEW && 'New Post'}
            </span>
            <Button className="text-sm px-4 py-1.5" type="submit" variant="rainbow-rounded">
              {props.type === PostFormType.EDIT && 'Save'}
              {props.type !== PostFormType.EDIT && 'Post'}
            </Button>
          </div>
          <PostBodyField
            name="body"
            placeholder="What's happening?"
            maxLength={setMaxInputLength(values.body)}
            updatedValue={onTextAreaChange}
          />
          {props.type === PostFormType.REPOST && (
            <div className="bg-neutral-800 p-4">
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
          {props.postLink && props.type !== PostFormType.REPOST && (() => {
            const mediaSource = IdentifySource(props.postLink)
            const mediaType = mediaSource.type

            // Enhanced URL with autoplay and no restrictions
            let enhancedUrl = props.postLink

            // CSS to prevent iframe reload on mobile orientation change
            // Also limit height to keep modal compact
            const orientationStableStyle = {
              contain: 'layout style' as const,
              willChange: 'contents' as const,
              transform: 'translateZ(0)',
              maxHeight: '200px',
            }

            // Platform-specific enhancements
            if (mediaType === MediaProvider.YOUTUBE) {
              const url = new URL(enhancedUrl)
              url.searchParams.set('autoplay', '1')
              url.searchParams.set('mute', '1')
              url.searchParams.set('iv_load_policy', '3') // Remove age restrictions
              url.searchParams.set('modestbranding', '1')
              url.searchParams.set('rel', '0')
              enhancedUrl = url.toString()

              // Return compact YouTube embed for modal preview
              return (
                <div className="w-full bg-black rounded-lg overflow-hidden" style={orientationStableStyle}>
                  <iframe
                    className="w-full h-[160px]"
                    frameBorder="0"
                    allowFullScreen
                    src={enhancedUrl}
                    title="Media preview"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  />
                </div>
              )
            }

            if (mediaType === MediaProvider.VIMEO) {
              const url = new URL(enhancedUrl)
              url.searchParams.set('autoplay', '1')
              url.searchParams.set('muted', '1')
              enhancedUrl = url.toString()

              // Return compact Vimeo embed for modal preview
              return (
                <div className="w-full bg-black rounded-lg overflow-hidden" style={orientationStableStyle}>
                  <iframe
                    className="w-full h-[160px]"
                    frameBorder="0"
                    allowFullScreen
                    src={enhancedUrl}
                    title="Media preview"
                    allow="autoplay; fullscreen; picture-in-picture"
                  />
                </div>
              )
            }

            if (mediaType === MediaProvider.INSTAGRAM) {
              // Instagram embeds - compact for modal
              return (
                <div style={orientationStableStyle}>
                  <iframe
                    className="w-full bg-gray-20 h-[180px]"
                    frameBorder="0"
                    allowFullScreen
                    scrolling="no"
                    src={enhancedUrl}
                    title="Media preview"
                    allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
                  />
                </div>
              )
            }

            if (mediaType === MediaProvider.TIKTOK) {
              // TikTok vertical video - compact for modal
              return (
                <div style={orientationStableStyle}>
                  <iframe
                    className="w-full bg-gray-20 h-[180px]"
                    frameBorder="0"
                    allowFullScreen
                    scrolling="no"
                    src={enhancedUrl}
                    title="Media preview"
                    allow="autoplay; encrypted-media; accelerometer; gyroscope"
                  />
                </div>
              )
            }

            if (mediaType === MediaProvider.X) {
              // X (Twitter) embeds - compact for modal
              return (
                <div style={orientationStableStyle}>
                  <iframe
                    className="w-full bg-gray-20 h-[180px]"
                    frameBorder="0"
                    allowFullScreen
                    scrolling="no"
                    src={enhancedUrl}
                    title="Media preview"
                  />
                </div>
              )
            }

            if (mediaType === MediaProvider.BANDCAMP) {
              // Bandcamp - compact for modal
              return (
                <div style={orientationStableStyle}>
                  <iframe
                    className="w-full bg-gray-20 h-[120px]"
                    frameBorder="0"
                    allowFullScreen
                    seamless
                    src={enhancedUrl}
                    title="Media preview"
                  />
                </div>
              )
            }

            if (mediaType === MediaProvider.TWITCH) {
              // Twitch livestream/VOD - compact for modal
              const url = new URL(enhancedUrl)
              url.searchParams.set('muted', '1')
              enhancedUrl = url.toString()

              return (
                <div className="w-full bg-black rounded-lg overflow-hidden" style={orientationStableStyle}>
                  <iframe
                    className="w-full h-[160px]"
                    frameBorder="0"
                    allowFullScreen
                    src={enhancedUrl}
                    title="Media preview"
                    allow="autoplay; fullscreen; picture-in-picture"
                  />
                </div>
              )
            }

            if (mediaType === MediaProvider.DISCORD) {
              // Discord server widget - compact for modal
              return (
                <div style={orientationStableStyle}>
                  <iframe
                    className="w-full bg-gray-20 h-[160px]"
                    frameBorder="0"
                    src={enhancedUrl}
                    title="Media preview"
                    sandbox="allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts"
                  />
                </div>
              )
            }

            // Default iframe for SoundCloud, Spotify, and Custom HTML - compact for modal
            return (
              <div className="w-full bg-black rounded-lg overflow-hidden" style={orientationStableStyle}>
                <iframe
                  className="w-full h-[120px]"
                  frameBorder="0"
                  allowFullScreen
                  src={enhancedUrl}
                  title="Media preview"
                  allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
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
