import classNames from 'classnames'
import { useModalDispatch, useModalState } from 'contexts/providers/modal'
import 'emoji-mart/css/emoji-mart.css'
import GraphemeSplitter from 'grapheme-splitter'
import { useCommentQuery } from 'lib/graphql'
import { default as React } from 'react'
import { CommentForm } from './CommentForm'
import { ModalsPortal } from '../ModalsPortal'

const baseClasses =
  'fixed top-0 w-screen bottom-0 duration-500 bg-opacity-75 ease-in-out bg-black transform-gpu transform'

const splitter = new GraphemeSplitter()

export const getBodyCharacterCount = (body?: string) => {
  return splitter.splitGraphemes(body || '').length
}

export const CommentModal = () => {
  const { showCommentModal, editCommentId = '' } = useModalState()
  const { dispatchShowCommentModal, dispatchSetEditCommentId } = useModalDispatch()

  const { data: editingComment } = useCommentQuery({
    variables: { id: editCommentId },
    skip: !editCommentId,
  })

  const initialValues = { body: editingComment?.comment.body || '' }

  const clearState = () => {
    dispatchShowCommentModal(false)
    dispatchSetEditCommentId(undefined)
  }

  const cancel = (setFieldValue: (val: string, newVal: string) => void) => {
    setFieldValue('body', '')
    clearState()
  }

  return (
    <ModalsPortal>
      <div
        className={classNames(baseClasses, {
          'translate-y-0 opacity-100': showCommentModal,
          'translate-y-full opacity-0': !showCommentModal,
        })}
      >
        <CommentForm initialValues={initialValues} afterSubmit={clearState} onCancel={cancel} />
      </div>
    </ModalsPortal>
  )
}

export default CommentModal
