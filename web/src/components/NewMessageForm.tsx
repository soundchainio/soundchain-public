import { Avatar } from 'components/Avatar'
import { Form, Formik, FormikHelpers, FormikProps } from 'formik'
import { useMe } from 'hooks/useMe'
import { Send } from 'icons/Send'
import { MutableRefObject, useState } from 'react'
import * as yup from 'yup'
import { SendMessageMutation, useSendMessageMutation } from '../lib/graphql'
import { FlexareaField } from './FlexareaField'
import { StickerPicker } from './StickerPicker'
import Picker from '@emoji-mart/react'

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
  const [sendMessage] = useSendMessageMutation({
    onCompleted: data => onNewMessage(data),
  })
  const me = useMe()
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [showStickerPicker, setShowStickerPicker] = useState(false)

  const handleSubmit = async ({ body }: FormValues, { resetForm }: FormikHelpers<FormValues>) => {
    await sendMessage({ variables: { input: { message: body, toId: profileId } } })
    resetForm()
    setShowEmojiPicker(false)
    setShowStickerPicker(false)
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

              <div className="flex flex-row items-start space-x-3 p-3 py-5">
                {me && <Avatar className="flex self-center" profile={me.profile} linkToProfile={false} />}
                <div className="flex-1 flex flex-col">
                  <FlexareaField
                    name="body"
                    id="newMessageInput"
                    placeholder="Write a message..."
                    maxLength={messageMaxLength}
                  />
                  {/* Emoji/Sticker toolbar */}
                  <div className="flex items-center gap-2 mt-1">
                    <button
                      type="button"
                      onClick={() => { setShowEmojiPicker(!showEmojiPicker); setShowStickerPicker(false) }}
                      className="text-lg hover:scale-110 transition-transform"
                      title="Add emoji"
                    >
                      {showEmojiPicker ? '❌' : '😊'}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setShowStickerPicker(!showStickerPicker); setShowEmojiPicker(false) }}
                      className="text-lg hover:scale-110 transition-transform"
                      title="Add sticker"
                    >
                      {showStickerPicker ? '❌' : '🎵'}
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
    </div>
  )
}
