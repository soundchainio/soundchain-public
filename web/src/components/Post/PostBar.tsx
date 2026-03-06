import { MusicalNoteIcon, VideoCameraIcon, ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline'
import Picker from '@emoji-mart/react'
import { Film } from 'lucide-react'

// Extended Emoji type with native property from emoji-mart picker callback
interface Emoji {
  id: string
  name: string
  native: string
  unified: string
  keywords: string[]
  shortcodes: string
}
import { useState } from 'react'
import { StickerPicker } from '../StickerPicker'
import { GifPicker } from '../GifPicker'
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
  hasMedia?: boolean
  // Accordion state
  showMusicAccordion?: boolean
  setShowMusicAccordion?: (val: boolean) => void
  showVideoAccordion?: boolean
  setShowVideoAccordion?: (val: boolean) => void
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
  hasMedia,
  showMusicAccordion,
  setShowMusicAccordion,
  showVideoAccordion,
  setShowVideoAccordion,
}: PostBarProps) => {
  const [isStickerPickerVisible, setStickerPickerVisible] = useState(false)
  const [isGifPickerVisible, setGifPickerVisible] = useState(false)
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

  const handleSelectSticker = (stickerUrl: string, stickerName: string) => {
    // Format as markdown that EmoteRenderer can parse: ![emote:name](url)
    // No extra spaces - let user control spacing for char count
    const emoteMarkdown = `![emote:${stickerName}](${stickerUrl})`
    if (getBodyCharacterCount(values.body) < maxLength) {
      setFieldValue('body', `${values.body}${emoteMarkdown}`)
    }
  }

  const onStickerPickerClick = () => {
    setStickerPickerVisible(!isStickerPickerVisible)
    setGifPickerVisible(false)
    if (isEmojiPickerVisible) onEmojiPickerClick()
  }

  const onGifPickerClick = () => {
    setGifPickerVisible(!isGifPickerVisible)
    setStickerPickerVisible(false)
    if (isEmojiPickerVisible) onEmojiPickerClick()
  }

  const onAddMusicClick = () => {
    if (setShowMusicAccordion) {
      setShowMusicAccordion(!showMusicAccordion)
      // Close video accordion if open
      if (setShowVideoAccordion && showVideoAccordion) {
        setShowVideoAccordion(false)
      }
    }
  }

  const onAddVideoClick = () => {
    if (setShowVideoAccordion) {
      setShowVideoAccordion(!showVideoAccordion)
      // Close music accordion if open
      if (setShowMusicAccordion && showMusicAccordion) {
        setShowMusicAccordion(false)
      }
    }
  }

  return (
    <div className="flex items-center p-4 border-t border-neutral-800" style={{ backgroundColor: '#262626' }}>
      <div className="w-12 cursor-pointer text-center" onClick={onEmojiPickerClick}>
        {isEmojiPickerVisible ? '❌' : '😃'}
      </div>
      <div className="w-12 cursor-pointer text-center" onClick={onStickerPickerClick}>
        {isStickerPickerVisible ? '❌' : '🎵'}
      </div>
      <div className="w-12 cursor-pointer text-center" onClick={onGifPickerClick}>
        <Film className={`m-auto w-5 ${isGifPickerVisible ? 'text-pink-400' : 'text-gray-400'}`} />
      </div>
      {!isRepost && showNewPost && (
        <>
          <button
            className={`w-12 cursor-pointer text-center flex items-center justify-center gap-0.5 ${showMusicAccordion ? 'text-cyan-400' : ''}`}
            aria-label="Embed a song to your post"
            onClick={onAddMusicClick}
          >
            <MusicalNoteIcon className="w-5" />
            {showMusicAccordion ? (
              <ChevronUpIcon className="w-3 h-3" />
            ) : (
              <ChevronDownIcon className="w-3 h-3" />
            )}
          </button>
          <button
            className={`w-12 cursor-pointer text-center flex items-center justify-center gap-0.5 ${showVideoAccordion ? 'text-cyan-400' : ''}`}
            aria-label="Embed a video to your post"
            onClick={onAddVideoClick}
          >
            <VideoCameraIcon className="w-5" />
            {showVideoAccordion ? (
              <ChevronUpIcon className="w-3 h-3" />
            ) : (
              <ChevronDownIcon className="w-3 h-3" />
            )}
          </button>
        </>
      )}
      <div className="flex-1 justify-self-end text-right text-gray-400">{charCounter}</div>
      {isEmojiPickerVisible && (
        <div className="fixed left-16 bottom-0 z-[60]" onClick={(e) => e.stopPropagation()}>
          <Picker theme="dark" perLine={8} onEmojiSelect={(e: Emoji) => handleSelectEmoji(e, values, setFieldValue)} />
        </div>
      )}
      {isStickerPickerVisible && (
        <div className="fixed left-32 bottom-0 z-[60]">
          <StickerPicker theme="dark" onSelect={handleSelectSticker} />
        </div>
      )}
      {isGifPickerVisible && (
        <div className="fixed left-32 bottom-0 z-[60]">
          <GifPicker
            theme="dark"
            onClose={() => setGifPickerVisible(false)}
            onSelect={(gifUrl, gifTitle) => {
              const emoteMarkdown = `![emote:gif:${gifTitle}](${gifUrl})`
              if (getBodyCharacterCount(values.body) < maxLength) {
                setFieldValue('body', `${values.body}${emoteMarkdown}`)
              }
            }}
          />
        </div>
      )}
    </div>
  )
}
