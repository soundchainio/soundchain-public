import { MusicalNoteIcon, VideoCameraIcon, XCircleIcon } from '@heroicons/react/24/outline'
import Picker from '@emoji-mart/react'
import { StickerPicker } from '../StickerPicker'
import { Sparkles } from 'lucide-react'
import { PostMediaUploader } from './PostMediaUploader'

// Extended Emoji type with native property from emoji-mart picker callback
interface Emoji {
  id: string
  name: string
  native: string
  unified: string
  keywords: string[]
  shortcodes: string
}
import { Edit } from 'icons/Edit'
import { CreatePostInput, useCreatePostMutation, useGuestCreatePostMutation } from 'lib/graphql'
import { useState } from 'react'
import { toast } from 'react-toastify'
import tw from 'tailwind-styled-components'
import { MediaProvider } from 'types/MediaProvider'
import { getNormalizedLink } from '../../utils/NormalizeEmbedLinks'
import { Button } from '../common/Buttons/Button'
import { LinkFormFooter } from './PostFormTimelineComponents/LinkFormFooter'
import { LinkItem } from './PostFormTimelineComponents/LinkItem'
import { MediaLink } from './PostLinkInput'
import { useMe } from 'hooks/useMe'
import { EmoteTextInput, getDisplayLength } from './EmoteTextInput'

export const PostFormTimeline = () => {
  const me = useMe()

  // Use refetchQueries to reload posts after creation
  // This ensures the feed updates with the new post
  const [createPost] = useCreatePostMutation({
    refetchQueries: ['Posts'],
    awaitRefetchQueries: true, // Wait for refetch to complete before success toast
  })

  const [guestCreatePost] = useGuestCreatePostMutation({
    refetchQueries: ['Posts'],
    awaitRefetchQueries: true,
  })

  const [postBody, setPostBody] = useState('')
  const [isMusicLinkVisible, setMusicLinkVisible] = useState(false)
  const [isVideoLinkVisible, setVideoLinkVisible] = useState(false)
  const [isPreviewVisible, setPreviewVisible] = useState(false)
  const [link, setLink] = useState<MediaLink>()
  const [showMediaUploader] = useState(true) // Always show media uploader
  const [isEmojiPickerOpen, setEmojiPickerOpen] = useState(false)
  const [isStickerPickerOpen, setStickerPickerOpen] = useState(false)
  const [uploadedMediaUrl, setUploadedMediaUrl] = useState<string | undefined>()
  const [uploadedMediaType, setUploadedMediaType] = useState<'image' | 'video' | 'audio' | undefined>()
  const postMaxLength = 1000
  const soundProviders = [MediaProvider.BANDCAMP, MediaProvider.SPOTIFY, MediaProvider.SOUNDCLOUD]
  const videoProviders = [
    MediaProvider.YOUTUBE,
    MediaProvider.VIMEO,
    MediaProvider.INSTAGRAM,
    MediaProvider.TIKTOK,
    MediaProvider.FACEBOOK,
    MediaProvider.X,
  ]
  const customProvider = MediaProvider.CUSTOM_HTML

  const onPostSubmit = async () => {
    if (getDisplayLength(postBody) > postMaxLength) {
      toast.warn(`Post can have a maximum of ${postMaxLength} characters count.`)
      return
    }

    // Require either text, a media link, or uploaded media
    if (!postBody.trim() && (!link || !link.value) && !uploadedMediaUrl) {
      toast.warn('Please enter some text, add a media link, or upload media.')
      return
    }

    const newPostParams: CreatePostInput = { body: postBody }

    if (link && link.value) newPostParams.mediaLink = link.value

    // Add ephemeral media if uploaded
    if (uploadedMediaUrl && uploadedMediaType) {
      (newPostParams as any).uploadedMediaUrl = uploadedMediaUrl;
      (newPostParams as any).uploadedMediaType = uploadedMediaType;
    }

    try {
      // Create post - authenticated users use regular mutation, others use guest mutation
      if (me) {
        await createPost({ variables: { input: newPostParams } })
        toast.success(`Post successfully created.`)
      } else {
        // Public post - generate valid Ethereum wallet address format
        // Create 40 hex characters (20 bytes) for the address after 0x
        const hexChars = '0123456789abcdef'
        let addressBody = ''
        for (let i = 0; i < 40; i++) {
          addressBody += hexChars[Math.floor(Math.random() * 16)]
        }
        const anonymousAddress = `0x${addressBody}`

        await guestCreatePost({
          variables: {
            input: newPostParams,
            walletAddress: anonymousAddress,
          },
        })
        toast.success(`Post created!`)
      }
      onLinkCancel()
      setPostBody('')
      // Reset uploaded media
      setUploadedMediaUrl(undefined)
      setUploadedMediaType(undefined)
    } catch (error: any) {
      // Log detailed error for debugging
      console.error('Post creation error:', error)
      console.error('Error message:', error?.message)
      console.error('GraphQL errors:', error?.graphQLErrors)
      console.error('Network error:', error?.networkError)
      toast.error(error?.message || 'We were unable to create your Post, try again in a few.')
    }
  }

  const onMusicLinkClick = () => {
    setMusicLinkVisible(!isMusicLinkVisible)
    setVideoLinkVisible(false)
    setPreviewVisible(false)
    resetLink()
  }

  const onVideoLinkClick = () => {
    setVideoLinkVisible(!isVideoLinkVisible)
    setMusicLinkVisible(false)
    setPreviewVisible(false)
    resetLink()
  }

  const handleSelectEmoji = (emoji: Emoji) => {
    setPostBody(currentBody => {
      return `${currentBody}${emoji.native}`
    })
  }

  const handleSelectSticker = (stickerUrl: string, stickerName: string) => {
    // Insert emote as an inline image markdown that can be rendered
    // Format: ![emote:name](url) - custom format for animated emotes
    // No extra spaces added - let user control spacing
    setPostBody(currentBody => {
      return `${currentBody}![emote:${stickerName}](${stickerUrl})`
    })
  }

  const resetLink = () => {
    setLink({ type: undefined, value: '' })
  }

  const onLinkCancel = () => {
    setPreviewVisible(false)
    setVideoLinkVisible(false)
    setMusicLinkVisible(false)
    resetLink()
  }

  const onSaveClick = async () => {
    if (!link?.value) return

    const normalizedLink = await getNormalizedLink(link.value)
    setLink({
      type: link?.type,
      value: normalizedLink,
    })
    setMusicLinkVisible(false)
    setVideoLinkVisible(false)
    setPreviewVisible(true)
  }

  const cancelPreviewClick = () => {
    setMusicLinkVisible(false)
    setVideoLinkVisible(false)
    setPreviewVisible(false)
    resetLink()
  }

  const editPreviewClick = () => {
    if (!link?.type) return

    setPreviewVisible(false)
    if (soundProviders.includes(link.type)) setMusicLinkVisible(true)
    if (videoProviders.includes(link.type)) setVideoLinkVisible(true)
    if (link.type === customProvider) {
      // Custom HTML can go to either music or video, default to video
      setVideoLinkVisible(true)
    }
  }

  // Allow public posting - no login or wallet required!

  return (
    <div className="mb-[25px] rounded-md bg-neutral-800 py-[14px] px-[16px]">
      <div className="mb-[16px] flex items-center justify-between">
        <span className="text-white">Post</span>
        {!me && (
          <span className="text-[10px] px-1.5 py-0.5 bg-neutral-700 text-neutral-300 rounded-full font-medium">Public</span>
        )}
      </div>
      <PostFormMiddleContainer>
        <EmoteTextInput
          placeholder="What's happening?"
          maxLength={postMaxLength}
          onChange={setPostBody}
          value={postBody}
          className="w-full text-xs text-white placeholder-neutral-500"
        />
        <div className="flex flex-row">
          <div className="flex basis-3/4">
            {/* Emoji Picker - controlled state to stay open for emoji flurries! */}
            <div className="relative">
              <button
                type="button"
                className="mr-[8px] w-6 cursor-pointer focus:outline-none"
                onClick={() => {
                  setEmojiPickerOpen(!isEmojiPickerOpen)
                  setStickerPickerOpen(false) // Close sticker picker if open
                }}
              >
                {isEmojiPickerOpen ? '❌' : '😃'}
              </button>
              {isEmojiPickerOpen && (
                <div className="absolute left-0 z-50 mt-2" onClick={(e) => e.stopPropagation()}>
                  <Picker
                    theme="dark"
                    perLine={7}
                    onEmojiSelect={(e: Emoji) => {
                      handleSelectEmoji(e)
                      // Picker stays open - blast those emojis! 🔥
                    }}
                    onClickOutside={() => setEmojiPickerOpen(false)}
                  />
                </div>
              )}
            </div>
            {/* Sticker Picker - controlled state to stay open for sticker flurries! */}
            <div className="relative">
              <button
                type="button"
                className="mr-[8px] w-6 cursor-pointer focus:outline-none"
                title="Stickers"
                onClick={() => {
                  setStickerPickerOpen(!isStickerPickerOpen)
                  setEmojiPickerOpen(false) // Close emoji picker if open
                }}
              >
                <Sparkles className={`m-auto w-5 ${isStickerPickerOpen ? 'text-cyan-400' : 'text-gray-400'}`} />
              </button>
              {isStickerPickerOpen && (
                <div className="absolute left-0 z-50 mt-2" onClick={(e) => e.stopPropagation()}>
                  <StickerPicker
                    onSelect={(stickerUrl, stickerName) => {
                      handleSelectSticker(stickerUrl, stickerName)
                      // Picker stays open - add multiple stickers! 🎵
                    }}
                    theme="dark"
                  />
                </div>
              )}
            </div>
            <button
              className="mr-[8px] w-6 cursor-pointer text-center"
              aria-label="Embed a song to your post"
              onClick={onMusicLinkClick}
            >
              <MusicalNoteIcon className="m-auto w-5 text-gray-400" />
            </button>
            <button
              className="w-6 cursor-pointer text-center"
              aria-label="Embed a video to your post"
              onClick={onVideoLinkClick}
            >
              <VideoCameraIcon className="m-auto w-5 text-gray-400" />
            </button>
          </div>
          <div className="basis-1/4">
            <span className="float-right text-gray-400">
              {getDisplayLength(postBody)} / {postMaxLength}
            </span>
          </div>
        </div>
      </PostFormMiddleContainer>

      {/* Ephemeral Media Uploader (24h stories) */}
      {(showMediaUploader || uploadedMediaUrl) && (
        <PostMediaUploader
          onMediaSelected={(url, type) => {
            setUploadedMediaUrl(url)
            setUploadedMediaType(type)
          }}
          onMediaRemoved={() => {
            setUploadedMediaUrl(undefined)
            setUploadedMediaType(undefined)
          }}
          currentUrl={uploadedMediaUrl}
          currentType={uploadedMediaType}
          isGuest={!me} // Use guest upload for unauthenticated users
        />
      )}

      {isMusicLinkVisible && !isVideoLinkVisible && !isPreviewVisible && (
        <PostFormLinkContainer>
          <div className="mb-[12px] flex">
            <LinkItem setLink={setLink} link={link} linkItemType={MediaProvider.CUSTOM_HTML} />
          </div>
          <div className="mb-[12px] flex">
            <LinkItem setLink={setLink} link={link} linkItemType={MediaProvider.SOUNDCLOUD} />
          </div>
          <div className="mb-[12px] flex">
            <LinkItem setLink={setLink} link={link} linkItemType={MediaProvider.SPOTIFY} />
          </div>
          <div className="flex">
            <LinkItem setLink={setLink} link={link} linkItemType={MediaProvider.BANDCAMP} />
          </div>
          <LinkFormFooter onLinkCancel={onLinkCancel} onSaveClick={onSaveClick} />
        </PostFormLinkContainer>
      )}

      {isVideoLinkVisible && !isMusicLinkVisible && !isPreviewVisible && (
        <PostFormLinkContainer>
          <div className="mb-[12px] flex">
            <LinkItem setLink={setLink} link={link} linkItemType={MediaProvider.CUSTOM_HTML} />
          </div>
          <div className="mb-[12px] flex">
            <LinkItem setLink={setLink} link={link} linkItemType={MediaProvider.YOUTUBE} />
          </div>
          <div className="mb-[12px] flex">
            <LinkItem setLink={setLink} link={link} linkItemType={MediaProvider.VIMEO} />
          </div>
          <div className="mb-[12px] flex">
            <LinkItem setLink={setLink} link={link} linkItemType={MediaProvider.INSTAGRAM} />
          </div>
          <div className="mb-[12px] flex">
            <LinkItem setLink={setLink} link={link} linkItemType={MediaProvider.TIKTOK} />
          </div>
          <div className="mb-[12px] flex">
            <LinkItem setLink={setLink} link={link} linkItemType={MediaProvider.FACEBOOK} />
          </div>
          <div className="mb-[12px] flex">
            <LinkItem setLink={setLink} link={link} linkItemType={MediaProvider.X} />
          </div>
          <LinkFormFooter onLinkCancel={onLinkCancel} onSaveClick={onSaveClick} />
        </PostFormLinkContainer>
      )}

      {isPreviewVisible && (
        <PostFormLinkContainer>
          <div className="mb-[8px] flex w-full flex-row-reverse justify-items-end">
            <button className="" aria-label="Close" onClick={cancelPreviewClick}>
              <XCircleIcon className="w-6" stroke="#737373" />
            </button>
            <button className="mr-[8px]" aria-label="Close" onClick={editPreviewClick}>
              <Edit className="w-6" stroke="#737373" />
            </button>
          </div>
          {/* Wrapper with CSS to prevent iframe reload on mobile orientation change */}
          <div style={{ contain: 'layout style', willChange: 'contents', transform: 'translateZ(0)' }}>
            <iframe
              className="w-full bg-gray-20"
              style={{
                minHeight: link?.type === MediaProvider.BANDCAMP ? '600px' : '500px',
                height: link?.type === MediaProvider.BANDCAMP ? 'auto' : '500px',
                aspectRatio: link?.type === MediaProvider.BANDCAMP ? 'auto' : '16/9',
              }}
              frameBorder="0"
              allowFullScreen
              src={link?.value}
              title="Media preview"
            />
          </div>
        </PostFormLinkContainer>
      )}

      {!isMusicLinkVisible && !isVideoLinkVisible && (
        <div className="w-full">
          <Button onClick={onPostSubmit}>Post</Button>
        </div>
      )}
    </div>
  )
}

const PostFormMiddleContainer = tw.div`
  mb-[16px]
  w-full
  rounded-md
  border-2
  border-neutral-700
  bg-neutral-900
  py-[8px] px-[12px]
`

const PostFormLinkContainer = tw.div`
  mb-[16px]
  rounded-md
  border-2
  border-neutral-700
  bg-neutral-800
  p-[12px]
`
