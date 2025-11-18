import { MusicalNoteIcon, VideoCameraIcon } from '@heroicons/react/24/outline'
import Picker from '@emoji-mart/react'
import type { Emoji } from '@emoji-mart/data'
import { useState } from 'react'
import { PostLinkType } from 'types/PostLinkType'
import { LinksModal } from '../LinksModal'
import { FormValues } from './PostForm'
import { getBodyCharacterCount, maxLength } from './PostModal'

interface PostBarProps {
  onEmojiPickerClick: () => void
  isEmojiPickerVisible: boolean
  isRepost: boolean
  showNewPost: boolean
  setOriginalLink: (val: string) => void
  setFieldValue: (field: string, value: string) => void
  values: FormValues
  postLink: string
  setPostLink: (val: string) => void
}

export const PostBar = ({
  onEmojiPickerClick,
  isEmojiPickerVisible,
  isRepost,
  showNewPost,
  setOriginalLink,
  setFieldValue,
  values,
  postLink,
  setPostLink,
}: PostBarProps) => {
  const [showAddMusicLink, setShowAddMusicLink] = useState(false)
  const [showAddVideoLink, setShowAddVideoLink] = useState(false)
  const charCounter = `${getBodyCharacterCount(values.body)} / ${maxLength}`

  const handleSelectEmoji = (
    emoji: Emoji,
    values: FormValues,
    setFieldValue: (val: string, newVal: string) => void,
  ) => {
    if (getBodyCharacterCount(values.body) < maxLength) {
      setFieldValue('body', `${values.body}${emoji.native}`)
    }
  }

  const onAddMusicClick = () => {
    setShowAddMusicLink(!showAddMusicLink)
  }

  const onAddVideoClick = () => {
    setShowAddVideoLink(!showAddVideoLink)
  }

  return (
    <div className="flex items-center bg-gray-15 p-4">
      <div className="w-16 cursor-pointer text-center" onClick={onEmojiPickerClick}>
        {isEmojiPickerVisible ? '❌' : '😃'}
      </div>
      {!isRepost && (
        <>
          <button
            className="w-16 cursor-pointer text-center"
            aria-label="Embed a song to your post"
            onClick={onAddMusicClick}
          >
            <MusicalNoteIcon className="m-auto w-5 text-gray-400" />
          </button>
          <button
            className="w-16 cursor-pointer text-center"
            aria-label="Embed a video to your post"
            onClick={onAddVideoClick}
          >
            <VideoCameraIcon className="m-auto w-5 text-gray-400" />
          </button>
        </>
      )}
      {showNewPost && !isRepost && (
        <>
          <LinksModal
            show={showAddMusicLink}
            setShow={setShowAddMusicLink}
            setOriginalLink={setOriginalLink}
            onClose={onAddMusicClick}
            type={PostLinkType.MUSIC}
            postLink={postLink}
            setPostLink={setPostLink}
          />
          <LinksModal
            show={showAddVideoLink}
            setShow={setShowAddVideoLink}
            setOriginalLink={setOriginalLink}
            onClose={onAddVideoClick}
            type={PostLinkType.VIDEO}
            postLink={postLink}
            setPostLink={setPostLink}
          />
        </>
      )}
      <div className="flex-1 justify-self-end text-right text-gray-400">{charCounter}</div>
      {isEmojiPickerVisible && (
        <div className="fixed left-16 bottom-0">
          <Picker theme="dark" perLine={8} onSelect={(e: Emoji) => handleSelectEmoji(e, values, setFieldValue)} />
        </div>
      )}
    </div>
  )
}
