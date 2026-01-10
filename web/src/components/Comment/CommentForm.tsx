import { useModalState } from 'contexts/ModalContext'
import { Form, Formik, FormikHelpers } from 'formik'
import { UpdateCommentInput, useUpdateCommentMutation } from 'lib/graphql'
import { useState } from 'react'
import * as yup from 'yup'
import { Button } from '../common/Buttons/Button'
import { FlexareaField } from '../FlexareaField'
import { StickerPicker } from '../StickerPicker'
import Picker from '@emoji-mart/react'

interface Emoji {
  id: string
  name: string
  native: string
}

interface InitialValues {
  body: UpdateCommentInput['body']
}

interface CommentFormProps {
  initialValues: InitialValues
  afterSubmit: () => void
  onCancel: (setFieldValue: (field: string, value: string) => void) => void
}

export interface FormValues {
  body: UpdateCommentInput['body']
}

const postSchema: yup.Schema<FormValues> = yup.object().shape({
  body: yup.string().required().max(500),
})

const defaultInitialValues = { body: '' }

export const CommentForm = ({ afterSubmit, initialValues, onCancel }: CommentFormProps) => {
  const { editCommentId } = useModalState()
  const [updateComment] = useUpdateCommentMutation()
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [showStickerPicker, setShowStickerPicker] = useState(false)

  const onSubmit = async (values: FormValues, { resetForm }: FormikHelpers<FormValues>) => {
    if (!editCommentId) {
      resetForm()
      afterSubmit()
      return
    }

    await updateComment({
      variables: { input: { body: values.body, commentId: editCommentId } },
    })

    resetForm()
    afterSubmit()
  }

  return (
    <Formik
      enableReinitialize={true}
      initialValues={initialValues || defaultInitialValues}
      validationSchema={postSchema}
      onSubmit={onSubmit}
    >
      {({ setFieldValue, isValid, values }) => (
        <Form className="flex h-full flex-col">
          <div className="flex items-center rounded-tl-3xl rounded-tr-3xl bg-gray-20">
            <div className="flex-1 p-2 text-center font-bold text-gray-400" onClick={() => onCancel(setFieldValue)}>
              Cancel
            </div>
            <div className="flex-1 text-center font-bold text-white">Edit Comment</div>
            <div className="m-2 flex-1 text-center">
              <div className="ml-6">
                <Button className="bg-gray-30 text-sm" type="submit" disabled={!isValid} variant="rainbow-rounded">
                  Save
                </Button>
              </div>
            </div>
          </div>
          <div className="flex-1 p-3 bg-gray-25">
            <FlexareaField name="body" placeholder="What's happening?" maxLength={500} />
            {/* Emoji/Sticker toolbar */}
            <div className="flex items-center gap-2 mt-2 relative">
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
              <span className="text-xs text-gray-500 ml-auto">{values.body?.length || 0}/500</span>
            </div>
            {/* Emoji Picker - flurry mode */}
            {showEmojiPicker && (
              <div className="absolute left-0 bottom-20 z-50">
                <Picker
                  theme="dark"
                  perLine={8}
                  onEmojiSelect={(emoji: Emoji) => {
                    if ((values.body?.length || 0) < 500) {
                      setFieldValue('body', (values.body || '') + emoji.native)
                    }
                  }}
                />
              </div>
            )}
            {/* Sticker Picker - flurry mode */}
            {showStickerPicker && (
              <div className="absolute left-0 bottom-20 z-50">
                <StickerPicker
                  theme="dark"
                  onSelect={(stickerUrl, stickerName) => {
                    const emoteMarkdown = `![emote:${stickerName}](${stickerUrl})`
                    if ((values.body?.length || 0) + emoteMarkdown.length <= 500) {
                      setFieldValue('body', (values.body || '') + emoteMarkdown)
                    }
                  }}
                />
              </div>
            )}
          </div>
        </Form>
      )}
    </Formik>
  )
}
