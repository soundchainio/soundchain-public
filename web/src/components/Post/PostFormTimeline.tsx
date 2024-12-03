import { PositioningPortal } from '@codastic/react-positioning-portal'
import { MusicNoteIcon, VideoCameraIcon, XCircleIcon } from '@heroicons/react/outline'
import { BaseEmoji, Picker } from 'emoji-mart'
import { Edit } from 'icons/Edit'
import { CreatePostInput, useCreatePostMutation } from 'lib/graphql'
import { ChangeEvent, useState } from 'react'
import { toast } from 'react-toastify'
import tw from 'tailwind-styled-components'
import { MediaProvider } from 'types/MediaProvider'
import { getNormalizedLink } from '../../utils/NormalizeEmbedLinks'
import { Button } from '../common/Buttons/Button'
import { LinkFormFooter } from './PostFormTimelineComponents/LinkFormFooter'
import { LinkItem } from './PostFormTimelineComponents/LinkItem'
import { MediaLink } from './PostLinkInput'

export const PostFormTimeline = () => {
  const [createPost] = useCreatePostMutation({ refetchQueries: ['Posts', 'Feed'] })
  const [postBody, setPostBody] = useState('')
  const [isEmojiPickerVisible, setEmojiPickerVisible] = useState(false)
  const [isMusicLinkVisible, setMusicLinkVisible] = useState(false)
  const [isVideoLinkVisible, setVideoLinkVisible] = useState(false)
  const [isPreviewVisible, setPreviewVisible] = useState(false)
  const [link, setLink] = useState<MediaLink>()
  const postMaxLength = 1000
  const soundProviders = [MediaProvider.BANDCAMP, MediaProvider.SPOTIFY, MediaProvider.SOUNDCLOUD]
  const videoProviders = [MediaProvider.YOUTUBE, MediaProvider.VIMEO]

  const onPostSubmit = async () => {
    if (postBody.length > postMaxLength) {
      toast.warn(`Post can have a maximum of ${postMaxLength} characters count.`)
      return
    }

    const newPostParams: CreatePostInput = { body: postBody }

    if (link && link.value) newPostParams.mediaLink = link.value

    try {
      await createPost({ variables: { input: newPostParams } })
      toast.success(`Post successfully created.`)
      onLinkCancel()
      setPostBody('')
    } catch (error) {
      // good to log the error here on console in case the transaction can't be seen in sentry
      console.log(error)
      toast.error('We were unable to create your Post, try again in a few.')
    }
  }

  const onTextAreaChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    setPostBody(event.target.value)
  }

  const onEmojiPickerClick = () => {
    setEmojiPickerVisible(!isEmojiPickerVisible)
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

  const handleSelectEmoji = (emoji: BaseEmoji) => {
    setPostBody(currentBody => {
      return `${currentBody}${emoji.native}`
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
  }

  return (
    <div className="mb-[25px] rounded-md bg-neutral-800 py-[14px] px-[16px]">
      <div className="mb-[16px]">
        <span className="text-white">Post</span>
      </div>
      <PostFormMiddleContainer>
        <PostFormTextArea
          placeholder="What's happening?"
          maxLength={postMaxLength}
          onChange={onTextAreaChange}
          value={postBody}
        ></PostFormTextArea>
        <div className="flex flex-row">
          <div className="flex basis-3/4">
            <PositioningPortal
              isOpen={isEmojiPickerVisible}
              portalContent={<Picker theme="dark" perLine={7} onSelect={(e: BaseEmoji) => handleSelectEmoji(e)} />}
            >
              <div className="mr-[8px] w-6 cursor-pointer" onClick={onEmojiPickerClick}>
                {isEmojiPickerVisible ? '❌' : '😃'}
              </div>
            </PositioningPortal>
            <button
              className="mr-[8px] w-6 cursor-pointer text-center"
              aria-label="Embed a song to your post"
              onClick={onMusicLinkClick}
            >
              <MusicNoteIcon className="m-auto w-5 text-gray-400" />
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
              {postBody.length} / {postMaxLength}
            </span>
          </div>
        </div>
      </PostFormMiddleContainer>

      {isMusicLinkVisible && !isVideoLinkVisible && !isPreviewVisible && (
        <PostFormLinkContainer>
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
            <LinkItem setLink={setLink} link={link} linkItemType={MediaProvider.VIMEO} />
          </div>
          <div className="mb-[12px] flex">
            <LinkItem setLink={setLink} link={link} linkItemType={MediaProvider.YOUTUBE} />
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
          <iframe
            className="min-h-[500px] w-full bg-gray-20"
            frameBorder="0"
            allowFullScreen
            src={link?.value}
            title="Media preview"
          />
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

const PostFormTextArea = tw.textarea`
  w-full
  resize-none
  border-0
  bg-neutral-900
  text-xs
  text-white
  placeholder-neutral-500
  focus:ring-0
`

const PostFormLinkContainer = tw.div`
  mb-[16px]
  rounded-md
  border-2
  border-neutral-700
  bg-neutral-800
  p-[12px]
`
