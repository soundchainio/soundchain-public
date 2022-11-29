import { PositioningPortal } from '@codastic/react-positioning-portal'
import { MusicNoteIcon, VideoCameraIcon, XCircleIcon } from '@heroicons/react/outline'
import { ClearInputButton } from 'components/common/Buttons/ClearInputButton'
import { BaseEmoji, Picker } from 'emoji-mart'
import { Bandcamp } from 'icons/Bandcamp'
import { Edit } from 'icons/Edit'
import { Soundcloud } from 'icons/Soundcloud'
import { Spotify } from 'icons/Spotify'
import { Vimeo } from 'icons/Vimeo'
import { Youtube } from 'icons/Youtube'
import { CreatePostInput, useCreatePostMutation } from 'lib/graphql'
import { ChangeEvent, useState } from 'react'
import { toast } from 'react-toastify'
import { MediaProvider } from 'types/MediaProvider'
import { getNormalizedLink } from '../../utils/NormalizeEmbedLinks'
import { Button } from '../common/Buttons/Button'
import { MediaLink } from './PostLinkInput'

export const PostFormTimeline = () => {
  const [createPost] = useCreatePostMutation({ refetchQueries: ['Posts', 'Feed'] })
  const [postBody, setPostBody] = useState('')
  const [isEmojiPickerVisible, setEmojiPickerVisible] = useState(false)
  const [isMusicLinkVisible, setMusicLinkVisible] = useState(false)
  const [isVideoLinkVisible, setVideoLinkVisible] = useState(false)
  const [isPreviewVisible, setPreviewVisible] = useState(false)
  const [link, setLink] = useState<MediaLink>()
  const postMaxLength = 500
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
      <div className="mb-[16px] w-full rounded-md border-2 border-neutral-700 bg-neutral-900 py-[8px] px-[12px]">
        <textarea
          className="w-full resize-none border-0 bg-neutral-900 text-xs text-white placeholder-neutral-500 focus:ring-0"
          placeholder="What's happening?"
          maxLength={postMaxLength}
          onChange={onTextAreaChange}
          value={postBody}
        ></textarea>
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
      </div>

      {isMusicLinkVisible && !isVideoLinkVisible && !isPreviewVisible && (
        <div className="mb-[16px] rounded-md border-2 border-neutral-700 bg-neutral-800 p-[12px]">
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
        </div>
      )}

      {isVideoLinkVisible && !isMusicLinkVisible && !isPreviewVisible && (
        <div className="mb-[16px] rounded-md border-2 border-neutral-700 bg-neutral-800 p-[12px]">
          <div className="mb-[12px] flex">
            <LinkItem setLink={setLink} link={link} linkItemType={MediaProvider.VIMEO} />
          </div>
          <div className="mb-[12px] flex">
            <LinkItem setLink={setLink} link={link} linkItemType={MediaProvider.YOUTUBE} />
          </div>
          <LinkFormFooter onLinkCancel={onLinkCancel} onSaveClick={onSaveClick} />
        </div>
      )}

      {isPreviewVisible && (
        <div className="mb-[16px] rounded-md border-2 border-neutral-700 bg-neutral-800 p-[12px]">
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
        </div>
      )}

      {!isMusicLinkVisible && !isVideoLinkVisible && (
        <div className="w-full">
          <Button onClick={onPostSubmit}>Post</Button>
        </div>
      )}
    </div>
  )
}

interface LinkFormFooterProps {
  onLinkCancel: () => void
  onSaveClick: () => void
}

const LinkFormFooter = ({ onLinkCancel, onSaveClick }: LinkFormFooterProps) => {
  return (
    <div className="flex w-full">
      <button
        className="mr-[12px] h-10 w-full cursor-pointer rounded-md border-2 border-neutral-400 bg-neutral-700 text-center text-neutral-400"
        onClick={onLinkCancel}
      >
        Cancel
      </button>
      <button
        className="h-10 w-full cursor-pointer rounded-md border-2 border-green-400 bg-green-900 text-center text-green-400"
        onClick={onSaveClick}
      >
        Save
      </button>
    </div>
  )
}

interface LinkItemProps {
  setLink: (value: MediaLink | undefined) => void
  link: MediaLink | undefined
  linkItemType: MediaProvider
}

const LinkItem = ({ setLink, link, linkItemType }: LinkItemProps) => {
  const initialFieldValue = link?.type === linkItemType ? link.value : ''
  const [fieldValue, setFieldValue] = useState<string>(initialFieldValue)
  const mediaProviderOptions = {
    [MediaProvider.SPOTIFY]: {
      example: 'https://open.spotify.com/track/6MQrN9j',
      logo: <Spotify className="mx-1 h-7 w-7" />,
    },
    [MediaProvider.SOUNDCLOUD]: {
      example: 'https://soundcloud.com/artist/music',
      logo: <Soundcloud color="#FF7A00" className="mx-2 mt-2 scale-150" />,
    },
    [MediaProvider.YOUTUBE]: {
      example: 'https://www.youtube.com/watch?v=Ks2Gsdie',
      logo: <Youtube className="mx-1 h-7 w-7" />,
    },
    [MediaProvider.VIMEO]: { example: 'https://vimeo.com/12345', logo: <Vimeo className="mx-1 h-7 w-7" /> },
    [MediaProvider.BANDCAMP]: {
      example: 'https://colleengreen.bandcamp.com/album/cool',
      logo: (
        <div className="mt-[-13px] flex w-[35px] flex-col items-center text-xs">
          <Bandcamp className="scale-[.35]" />
        </div>
      ),
    },
  }

  const resetLink = () => {
    setLink({ type: undefined, value: '' })
    setFieldValue('')
  }

  const onLinkChange = (value: string) => {
    if (!value) {
      resetLink()
      return
    }
    setLink({ value, type: linkItemType })
    setFieldValue(value)
  }

  return (
    <>
      {mediaProviderOptions[linkItemType].logo}
      <input
        type="text"
        className="mx-[8px] h-8 w-full rounded border border-neutral-700 bg-neutral-900 text-xs text-white placeholder-neutral-500 focus:ring-0"
        placeholder={mediaProviderOptions[linkItemType].example}
        onChange={e => onLinkChange(e.target.value)}
        disabled={link?.type && link?.type !== linkItemType}
        value={fieldValue}
      />
      <ClearInputButton resetLink={resetLink} />
    </>
  )
}
