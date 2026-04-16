import { Avatar } from 'components/Avatar'
import { Form, Formik, FormikHelpers, FormikProps } from 'formik'
import { useMe } from 'hooks/useMe'
import { Send } from 'icons/Send'
import { MutableRefObject, useState } from 'react'
import * as yup from 'yup'
import { SendMessageMutation } from '../lib/graphql'
import { FlexareaField } from './FlexareaField'
import { StickerPicker } from './StickerPicker'
import { GifPicker } from './GifPicker'
import { CreateStoryModal } from './dex/CreateStoryModal'
import Picker from '@emoji-mart/react'
import { Smile, Sparkles, Film, Video } from 'lucide-react'

interface Emoji {
  id: string
  name: string
  native: string
}

const messageMaxLength = 1000

export interface NewMessageFormProps {
  profileId: string
  onNewMessage: (message: SendMessageMutation) => void
  bottomRef: MutableRefObject<HTMLDivElement>
}

interface FormValues {
  body: string
}

const validationSchema: yup.Schema<FormValues> = yup.object().shape({
  body: yup.string().required().max(messageMaxLength),
})

const initialValues: FormValues = { body: '' }

export const NewMessageForm = ({ profileId, onNewMessage, bottomRef }: NewMessageFormProps) => {
  const me = useMe()
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [showStickerPicker, setShowStickerPicker] = useState(false)
  const [showGifPicker, setShowGifPicker] = useState(false)
  const [showStoryModal, setShowStoryModal] = useState(false)

  const handleSubmit = async ({ body }: FormValues, { resetForm }: FormikHelpers<FormValues>) => {
    try {
      const r = await fetch('/api/dm/send', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toId: profileId, message: body }),
      })
      if (r.ok) {
        const data = await r.json()
        // Mimic the SendMessageMutation shape the parent consumer expects
        onNewMessage({ sendMessage: data.message } as unknown as SendMessageMutation)
      }
    } catch {}
    resetForm()
    setShowEmojiPicker(false)
    setShowStickerPicker(false)
    setShowGifPicker(false)
    bottomRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    })
  }

  return (
    <div className="fixed bottom-20 right-0 left-0 z-20 sm:bottom-0 sm:pr-[5px]">
      <Formik initialValues={initialValues} validationSchema={validationSchema} onSubmit={handleSubmit}>
        {({ isSubmitting, isValid, dirty, values, setFieldValue }: FormikProps<FormValues>) => (
          <Form>
            <div className="flex flex-col bg-gray-25">
              {/* Emoji/Sticker Pickers - positioned above input */}
              {showEmojiPicker && (
                <div className="absolute bottom-full left-0 mb-2 z-50">
                  <Picker
                    theme="dark"
                    perLine={8}
                    onEmojiSelect={(emoji: Emoji) => {
                      if ((values.body?.length || 0) < messageMaxLength) {
                        setFieldValue('body', (values.body || '') + emoji.native)
                      }
                    }}
                  />
                </div>
              )}
              {showStickerPicker && (
                <div className="absolute bottom-full left-0 mb-2 z-50">
                  <StickerPicker
                    theme="dark"
                    onSelect={(stickerUrl, stickerName) => {
                      const emoteMarkdown = `![emote:${stickerName}](${stickerUrl})`
                      if ((values.body?.length || 0) + emoteMarkdown.length <= messageMaxLength) {
                        setFieldValue('body', (values.body || '') + emoteMarkdown)
                      }
                    }}
                  />
                </div>
              )}
              {showGifPicker && (
                <div className="absolute bottom-full left-0 mb-2 z-50">
                  <GifPicker
                    theme="dark"
                    onClose={() => setShowGifPicker(false)}
                    onSelect={(gifUrl, gifTitle) => {
                      const gifMarkdown = `![emote:gif:${gifTitle}](${gifUrl})`
                      if ((values.body?.length || 0) + gifMarkdown.length <= messageMaxLength) {
                        setFieldValue('body', (values.body || '') + gifMarkdown)
                      }
                    }}
                  />
                </div>
              )}

              <div className="flex flex-row items-start space-x-3 p-3 py-5">
                {me && <Avatar className="flex self-center" profile={me.profile} linkToProfile={false} />}
                <div className="flex-1 flex flex-col">
                  <FlexareaField
                    name="body"
                    id="newMessageInput"
                    placeholder="Write a message..."
                    maxLength={messageMaxLength}
                  />
                  {/* Emoji/Sticker/GIF/Story toolbar */}
                  <div className="flex items-center gap-1.5 mt-1">
                    <button
                      type="button"
                      onClick={() => { setShowEmojiPicker(!showEmojiPicker); setShowStickerPicker(false); setShowGifPicker(false) }}
                      className={`p-1 rounded-lg transition-all flex items-center gap-0.5 ${
                        showEmojiPicker
                          ? 'bg-gradient-to-r from-yellow-500/20 to-orange-500/20 text-yellow-400 ring-1 ring-yellow-400'
                          : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700 hover:text-white'
                      }`}
                      title="Add emoji"
                    >
                      <Smile className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => { setShowStickerPicker(!showStickerPicker); setShowEmojiPicker(false); setShowGifPicker(false) }}
                      className={`p-1 rounded-lg transition-all flex items-center gap-0.5 ${
                        showStickerPicker
                          ? 'bg-gradient-to-r from-cyan-500/20 to-purple-500/20 text-cyan-400 ring-1 ring-cyan-400'
                          : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700 hover:text-white'
                      }`}
                      title="Add stickers"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => { setShowGifPicker(!showGifPicker); setShowEmojiPicker(false); setShowStickerPicker(false) }}
                      className={`p-1 rounded-lg transition-all flex items-center gap-0.5 ${
                        showGifPicker
                          ? 'bg-gradient-to-r from-pink-500/20 to-rose-500/20 text-pink-400 ring-1 ring-pink-400'
                          : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700 hover:text-white'
                      }`}
                      title="Search GIFs"
                    >
                      <Film className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowStoryModal(true)}
                      className="p-1 rounded-lg transition-all flex items-center gap-0.5 bg-neutral-800 text-neutral-400 hover:bg-neutral-700 hover:text-cyan-400"
                      title="Create Story / Reel"
                    >
                      <Video className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-xs text-gray-500 ml-auto">{values.body?.length || 0}/{messageMaxLength}</span>
                  </div>
                </div>
                <button type="submit" disabled={isSubmitting} className="pt-1">
                  <Send color={dirty && isValid ? 'green-blue' : undefined} />
                </button>
              </div>
            </div>
          </Form>
        )}
      </Formik>

      {/* Create Story Modal */}
      {showStoryModal && (
        <CreateStoryModal
          isOpen={showStoryModal}
          onClose={() => setShowStoryModal(false)}
        />
      )}
    </div>
  )
}
