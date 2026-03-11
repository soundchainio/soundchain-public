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
import { useEffect, useRef, useState } from 'react'
import { ExternalLink } from 'lucide-react'
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
import { PostMediaUploader } from './PostMediaUploader'
import { InlineEmbedPicker } from './InlineEmbedPicker'
import { useMe } from 'hooks/useMe'

// YouTube embed preview with age-restriction bypass via Piped proxy
// When YouTube blocks an embed (age-restricted), we fetch the direct stream URL
// from Piped API and play it in a native HTML5 <video> element — no restrictions.
const YouTubePreview = ({ embedUrl, thumbnailUrl, watchUrl, orientationStableStyle }: {
  embedUrl: string
  thumbnailUrl: string | null
  watchUrl: string
  orientationStableStyle: Record<string, any>
}) => {
  const [blocked, setBlocked] = useState(false)
  const [streamUrl, setStreamUrl] = useState<string | null>(null)
  const [streamLoading, setStreamLoading] = useState(false)
  const playerReady = useRef(false)

  // Extract video ID from embed URL
  const vidMatch = embedUrl.match(/embed\/([a-zA-Z0-9_-]{11})/)
  const videoId = vidMatch?.[1]

  useEffect(() => {
    playerReady.current = false
    setBlocked(false)
    setStreamUrl(null)

    const handleMessage = (e: MessageEvent) => {
      try {
        if (typeof e.data === 'string') {
          const data = JSON.parse(e.data)
          if (data?.event === 'onReady' || data?.event === 'onStateChange') {
            playerReady.current = true
          }
          if (data?.event === 'onError' || data?.info === 150) {
            setBlocked(true)
          }
        }
      } catch { /* not JSON */ }
    }
    window.addEventListener('message', handleMessage)

    // Timeout: if YouTube player doesn't report ready in 4s, it's blocked
    const timer = setTimeout(() => {
      if (!playerReady.current) setBlocked(true)
    }, 4000)

    return () => {
      window.removeEventListener('message', handleMessage)
      clearTimeout(timer)
    }
  }, [embedUrl])

  // When blocked, fetch direct stream from Piped
  useEffect(() => {
    if (!blocked || !videoId || streamUrl || streamLoading) return
    setStreamLoading(true)
    fetch(`/api/youtube/stream?v=${videoId}`)
      .then(r => r.json())
      .then(data => {
        if (data.videoUrl) setStreamUrl(data.videoUrl)
      })
      .catch(() => {})
      .finally(() => setStreamLoading(false))
  }, [blocked, videoId, streamUrl, streamLoading])

  // State: playing via Piped proxy stream
  if (blocked && streamUrl) {
    return (
      <div className="w-full bg-black rounded-lg overflow-hidden" style={orientationStableStyle}>
        <video
          className="w-full h-[160px] object-contain bg-black"
          controls
          autoPlay
          muted
          playsInline
          src={streamUrl}
        />
      </div>
    )
  }

  // State: blocked, fetching stream
  if (blocked && streamLoading) {
    return (
      <div className="relative flex w-full h-[160px] items-center justify-center bg-neutral-900 rounded-lg overflow-hidden">
        {thumbnailUrl && (
          <img src={thumbnailUrl} alt="" className="absolute inset-0 w-full h-full object-cover opacity-20" />
        )}
        <div className="relative z-10 flex flex-col items-center gap-1.5">
          <div className="w-5 h-5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
          <span className="text-white/60 text-xs">Loading stream...</span>
        </div>
      </div>
    )
  }

  // State: blocked, stream failed — fallback to "Watch on YouTube"
  if (blocked) {
    return (
      <a
        href={watchUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="relative flex w-full h-[160px] items-center justify-center bg-neutral-900 rounded-lg overflow-hidden cursor-pointer hover:bg-neutral-800 transition-colors"
      >
        {thumbnailUrl && (
          <img src={thumbnailUrl} alt="" className="absolute inset-0 w-full h-full object-cover opacity-30" />
        )}
        <div className="relative z-10 flex flex-col items-center gap-1.5">
          <ExternalLink className="w-6 h-6 text-cyan-400" />
          <span className="text-white font-medium text-sm">Watch on YouTube</span>
          <span className="text-white/50 text-xs">Tap to open on YouTube</span>
        </div>
      </a>
    )
  }

  // State: normal YouTube embed (not blocked)
  return (
    <div className="w-full bg-black rounded-lg overflow-hidden" style={orientationStableStyle}>
      <iframe
        className="w-full h-[160px]"
        frameBorder="0"
        allowFullScreen
        src={`${embedUrl}${embedUrl.includes('?') ? '&' : '?'}enablejsapi=1`}
        title="Media preview"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
      />
    </div>
  )
}

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
  const me = useMe()
  const [isEmojiPickerVisible, setEmojiPickerVisible] = useState(false)
  const [showMediaUploader] = useState(true) // Always show media uploader
  const [uploadedMediaUrl, setUploadedMediaUrl] = useState<string | undefined>()
  const [uploadedMediaType, setUploadedMediaType] = useState<'image' | 'video' | 'audio' | undefined>()
  const [uploadedMediaThumbnail, setUploadedMediaThumbnail] = useState<string | undefined>()
  const [showMusicAccordion, setShowMusicAccordion] = useState(false)
  const [showVideoAccordion, setShowVideoAccordion] = useState(false)
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

          // Add uploaded media if present
          if (uploadedMediaUrl && uploadedMediaType) {
            (newPostParams as any).uploadedMediaUrl = uploadedMediaUrl;
            (newPostParams as any).uploadedMediaType = uploadedMediaType;
            if (uploadedMediaThumbnail) {
              (newPostParams as any).uploadedMediaThumbnail = uploadedMediaThumbnail;
            }
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
              url.searchParams.set('modestbranding', '1')
              url.searchParams.set('rel', '0')
              enhancedUrl = url.toString()

              // Extract video ID for thumbnail
              const vidMatch = enhancedUrl.match(/embed\/([a-zA-Z0-9_-]{11})/)
              const videoId = vidMatch?.[1]
              const thumbnailUrl = videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : null
              const watchUrl = videoId ? `https://www.youtube.com/watch?v=${videoId}` : enhancedUrl

              // YouTube preview with age-restriction fallback
              return <YouTubePreview
                embedUrl={enhancedUrl}
                thumbnailUrl={thumbnailUrl}
                watchUrl={watchUrl}
                orientationStableStyle={orientationStableStyle}
              />
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
          {/* Media Uploader - shown when user clicks photo icon */}
          {(showMediaUploader || uploadedMediaUrl) && props.type === PostFormType.NEW && (
            <PostMediaUploader
              onMediaSelected={(url, type, thumbnailUrl) => {
                setUploadedMediaUrl(url)
                setUploadedMediaType(type)
                setUploadedMediaThumbnail(thumbnailUrl)
              }}
              onMediaRemoved={() => {
                setUploadedMediaUrl(undefined)
                setUploadedMediaType(undefined)
                setUploadedMediaThumbnail(undefined)
              }}
              currentUrl={uploadedMediaUrl}
              currentType={uploadedMediaType}
              isGuest={!me}
            />
          )}
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
            hasMedia={!!uploadedMediaUrl}
            showMusicAccordion={showMusicAccordion}
            setShowMusicAccordion={setShowMusicAccordion}
            showVideoAccordion={showVideoAccordion}
            setShowVideoAccordion={setShowVideoAccordion}
          />
          {/* Inline Embed Accordions - attached to PostBar */}
          {showMusicAccordion && props.type !== PostFormType.REPOST && (
            <InlineEmbedPicker
              type="music"
              onLinkChange={(link) => props.setOriginalLink(link)}
              currentLink={props.originalLink}
            />
          )}
          {showVideoAccordion && props.type !== PostFormType.REPOST && (
            <InlineEmbedPicker
              type="video"
              onLinkChange={(link) => props.setOriginalLink(link)}
              currentLink={props.originalLink}
            />
          )}
        </Form>
      )}
    </Formik>
  )
}
