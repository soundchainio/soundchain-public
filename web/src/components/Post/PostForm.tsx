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

const postSchema: yup.Schema<FormValues> = yup.object().shape({
  body: yup.string().required(),
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
    switch (props.type) {
      case PostFormType.REPOST:
        await createRepost({ variables: { input: { body: values.body, repostId: repostId as string } } })
        break
      case PostFormType.EDIT:
        const updateParams: UpdatePostInput = { body: values.body, postId: editPostId as string }

        if (props.postLink?.length) {
          updateParams.mediaLink = props.postLink
        }

        await editPost({ variables: { input: updateParams } })
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
    }

    resetForm()

    props.afterSubmit()
  }

  const onTextAreaChange = (newVal: string) => {
    props.setBodyValue(newVal)
  }
  return (
    <Formik
      enableReinitialize={true}
      initialValues={props.initialValues || defaultInitialValues}
      validationSchema={postSchema}
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
          {props.postLink && props.type !== PostFormType.REPOST && (() => {
            const mediaSource = IdentifySource(props.postLink)
            const mediaType = mediaSource.type

            // Enhanced URL with autoplay and no restrictions
            let enhancedUrl = props.postLink

            // Platform-specific enhancements
            if (mediaType === MediaProvider.YOUTUBE) {
              const url = new URL(enhancedUrl)
              url.searchParams.set('autoplay', '1')
              url.searchParams.set('mute', '1')
              url.searchParams.set('iv_load_policy', '3') // Remove age restrictions
              url.searchParams.set('modestbranding', '1')
              url.searchParams.set('rel', '0')
              enhancedUrl = url.toString()

              // Return responsive YouTube embed - fixed height on mobile to reduce letterboxing
              return (
                <div className="w-full bg-black rounded-lg overflow-hidden">
                  <iframe
                    className="w-full h-[280px] sm:h-[350px] md:aspect-video md:h-auto"
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

              // Return responsive Vimeo embed - fixed height on mobile to reduce letterboxing
              return (
                <div className="w-full bg-black rounded-lg overflow-hidden">
                  <iframe
                    className="w-full h-[280px] sm:h-[350px] md:aspect-video md:h-auto"
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
              // Instagram embeds - responsive
              return (
                <iframe
                  className="w-full bg-gray-20 h-[80vh] max-h-[700px] md:h-[700px]"
                  frameBorder="0"
                  allowFullScreen
                  scrolling="no"
                  src={enhancedUrl}
                  title="Media preview"
                  allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
                />
              )
            }

            if (mediaType === MediaProvider.TIKTOK) {
              // TikTok vertical video - responsive
              return (
                <iframe
                  className="w-full bg-gray-20 h-[80vh] max-h-[650px] md:h-[650px]"
                  frameBorder="0"
                  allowFullScreen
                  scrolling="no"
                  src={enhancedUrl}
                  title="Media preview"
                  allow="autoplay; encrypted-media; accelerometer; gyroscope"
                />
              )
            }

            if (mediaType === MediaProvider.X) {
              // X (Twitter) embeds - responsive
              return (
                <iframe
                  className="w-full bg-gray-20 h-[70vh] max-h-[700px] md:h-[700px]"
                  frameBorder="0"
                  allowFullScreen
                  scrolling="no"
                  src={enhancedUrl}
                  title="Media preview"
                />
              )
            }

            if (mediaType === MediaProvider.BANDCAMP) {
              // Bandcamp with tracklist visible - responsive
              return (
                <iframe
                  className="w-full bg-gray-20 h-[500px] md:h-[600px]"
                  frameBorder="0"
                  allowFullScreen
                  seamless
                  src={enhancedUrl}
                  title="Media preview"
                />
              )
            }

            if (mediaType === MediaProvider.TWITCH) {
              // Twitch livestream/VOD - responsive with autoplay
              const url = new URL(enhancedUrl)
              url.searchParams.set('muted', '1')
              enhancedUrl = url.toString()

              return (
                <div className="w-full bg-black rounded-lg overflow-hidden">
                  <iframe
                    className="w-full h-[280px] sm:h-[350px] md:aspect-video md:h-auto"
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
              // Discord server widget - responsive
              return (
                <iframe
                  className="w-full bg-gray-20 h-[500px] md:h-[600px]"
                  frameBorder="0"
                  src={enhancedUrl}
                  title="Media preview"
                  sandbox="allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts"
                />
              )
            }

            // Default iframe for SoundCloud, Spotify, and Custom HTML
            return (
              <div className="w-full bg-black rounded-lg overflow-hidden">
                <iframe
                  className="w-full h-[280px] sm:h-[350px] md:aspect-video md:h-auto"
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
