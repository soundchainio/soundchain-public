import classNames from 'classnames'
import { useModalDispatch, useModalState } from 'contexts/ModalContext'
import GraphemeSplitter from 'grapheme-splitter'
import { usePostLazyQuery } from 'lib/graphql'
import { useCallback, useEffect, useState } from 'react'
import { PostFormType } from 'types/PostFormType'
import { getNormalizedLink, hasLink } from '../../utils/NormalizeEmbedLinks'
import { ModalsPortal } from '../ModalsPortal'
import { PostForm } from './PostForm'

const baseClasses =
  'fixed top-0 w-screen bottom-0 duration-500 bg-opacity-75 ease-in-out bg-black transform-gpu transform'

export const maxLength = 1000

const splitter = new GraphemeSplitter()

export const getBodyCharacterCount = (body?: string) => {
  return splitter.splitGraphemes(body || '').length
}

// When we get string.length, emojis are counted as 2 characters
// This functions fixes the input maxLength and adjust to count an emoji as 1 char
export const setMaxInputLength = (input: string) => {
  const rawValue = input.length

  return maxLength + (rawValue - getBodyCharacterCount(input))
}

export const PostModal = () => {
  const [postType, setPostType] = useState<PostFormType>(PostFormType.NEW)
  const [originalLink, setOriginalLink] = useState('')
  const [postLink, setPostLink] = useState('')
  const [bodyValue, setBodyValue] = useState('')

  const { showNewPost, repostId, editPostId, trackId } = useModalState()
  const { dispatchShowPostModal, dispatchSetRepostId, dispatchSetEditPostId } = useModalDispatch()

  const [getPost, { data: editingPost }] = usePostLazyQuery()

  const initialValues = { body: editingPost?.post.body || '' }

  const clearState = () => {
    dispatchShowPostModal(false, undefined)
    setPostLink('')
    dispatchSetRepostId(undefined)
    dispatchSetEditPostId(undefined)
  }

  const cancel = (setFieldValue: (val: string, newVal: string) => void) => {
    setFieldValue('body', '')
    clearState()
  }

  const normalizeOriginalLink = useCallback(async () => {
    if (originalLink.length && hasLink(originalLink)) {
      const link = await getNormalizedLink(originalLink)
      setPostLink(link)
    } else {
      setPostLink('')
    }
  }, [originalLink])

  useEffect(() => {
    if (editPostId) {
      getPost({ variables: { id: editPostId } })
    }
  }, [editPostId, getPost])

  useEffect(() => {
    const delayDebounce = setTimeout(async () => {
      if (bodyValue.length) {
        const link = await getNormalizedLink(bodyValue)
        if (link) {
          setPostLink(link)
        } else if (!originalLink && postType !== PostFormType.EDIT) {
          setPostLink('')
        }
      } else if (!originalLink && postType !== PostFormType.EDIT) {
        setPostLink('')
      }
    }, 1000)

    return () => clearTimeout(delayDebounce)
  }, [bodyValue])

  useEffect(() => {
    if (originalLink) {
      normalizeOriginalLink()
    } else if (postType !== PostFormType.EDIT) {
      setPostLink('')
    }
  }, [normalizeOriginalLink, originalLink])

  useEffect(() => {
    if (showNewPost) {
      setOriginalLink('')
    }
  }, [showNewPost])

  useEffect(() => {
    if (repostId) {
      setPostType(PostFormType.REPOST)
    }

    if (editPostId) {
      setPostType(PostFormType.EDIT)
    }

    if (!editPostId && !repostId) {
      setPostType(PostFormType.NEW)
    }
  }, [repostId, editPostId])

  useEffect(() => {
    if (editingPost) {
      setPostLink(editingPost.post.mediaLink || '')
      setBodyValue(editingPost.post.body || '')
    }
  }, [editingPost])

  return (
    <ModalsPortal>
      <div
        className={classNames(baseClasses, {
          'translate-y-0 opacity-100': showNewPost,
          'translate-y-full opacity-0': !showNewPost,
        })}
      >
        <PostForm
          type={postType}
          initialValues={initialValues}
          postLink={postLink}
          afterSubmit={clearState}
          onCancel={cancel}
          showNewPost={showNewPost}
          setOriginalLink={setOriginalLink}
          setPostLink={setPostLink}
          setBodyValue={setBodyValue}
          trackId={trackId}
        />
      </div>
    </ModalsPortal>
  )
}

export default PostModal
