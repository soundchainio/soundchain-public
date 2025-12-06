import classNames from 'classnames'
import { useModalDispatch, useModalState } from 'contexts/ModalContext'
import { useMe } from 'hooks/useMe'
import {
  CommentsDocument,
  PostsDocument,
  useDeleteCommentMutation,
  useDeletePostMutation,
  useTrackLazyQuery,
} from 'lib/graphql'
import { useRouter } from 'next/router'
import { AuthorActionsType } from 'types/AuthorActionsType'
import { Delete as DeleteButton } from '../common/Buttons/Delete'
import { Edit as EditButton } from '../common/Buttons/Edit'
import { ModalsPortal } from '../ModalsPortal'

const baseClasses =
  'fixed w-screen h-full bottom-0 duration-500 bg-opacity-75 ease-in-out bg-black transform-gpu transform'

export const AuthorActionsModal = () => {
  const me = useMe()
  const { showAuthorActions, authorActionsId, authorActionsType, showOnlyDeleteOption } = useModalState()
  const {
    dispatchShowAuthorActionsModal,
    dispatchShowPostModal,
    dispatchSetEditPostId,
    dispatchSetEditCommentId,
    dispatchShowCommentModal,
    dispatchShowConfirmDeleteNFTModal,
    dispatchShowConfirmDeleteEditionModal,
  } = useModalDispatch()
  const router = useRouter()

  const [getTrack] = useTrackLazyQuery()

  const [deleteComment] = useDeleteCommentMutation({
    refetchQueries: [CommentsDocument],
    update: (cache, data) => {
      cache.evict({ id: cache.identify(data.data!.deleteComment.comment!) })
    },
  })

  const [deletePost] = useDeletePostMutation({
    refetchQueries: [PostsDocument],
    update: (cache, data) => {
      cache.evict({ id: cache.identify(data.data!.deletePost.post!) })
    },
  })

  const onOutsideClick = () => {
    dispatchShowAuthorActionsModal({
      showAuthorActions: false,
      authorActionsType: AuthorActionsType.POST,
      authorActionsId: '',
    })
  }

  const onEdit = () => {
    onOutsideClick()
    switch (authorActionsType) {
      case AuthorActionsType.POST:
        dispatchSetEditPostId(authorActionsId)
        dispatchShowPostModal(true)
        break
      case AuthorActionsType.COMMENT:
        dispatchSetEditCommentId(authorActionsId)
        dispatchShowCommentModal(true)
        break
    }
  }

  const onDeleteNFT = async () => {
    const { data: track } = await getTrack({ variables: { id: authorActionsId } })
    if (track) {
      // only the NFT owner should have the right to burn the NFT
      const shouldBurn = me?.profile.id === track?.track.profileId
      dispatchShowConfirmDeleteNFTModal({ show: true, trackId: track.track.id, burn: shouldBurn })
    }
  }

  const onDeleteEdition = async () => {
    const { data: track } = await getTrack({ variables: { id: authorActionsId } })
    if (track) {
      dispatchShowConfirmDeleteEditionModal({
        show: true,
        trackEditionId: track.track.trackEditionId!,
        trackId: track.track.id,
      })
    }
  }

  const onDelete = async () => {
    switch (authorActionsType) {
      case AuthorActionsType.POST:
        await deletePost({ variables: { input: { postId: authorActionsId } } })
        if (router.asPath.includes('/posts/')) {
          router.back()
        }
        break
      case AuthorActionsType.COMMENT:
        await deleteComment({ variables: { input: { commentId: authorActionsId } } })
        break
      case AuthorActionsType.NFT:
        onDeleteNFT()
        break
      case AuthorActionsType.EDITION:
        onDeleteEdition()
        break
    }
    onOutsideClick()
  }

  return (
    <ModalsPortal>
      <div
        className={classNames(baseClasses, {
          'translate-y-0 opacity-100': showAuthorActions,
          'translate-y-full opacity-0': !showAuthorActions,
        })}
      >
        <div className="flex h-full flex-col">
          <div className="flex-1" onClick={onOutsideClick}></div>
          <div className="p-4 text-white">
            {!showOnlyDeleteOption && (
              <EditButton className="mb-4 p-4" onClick={onEdit}>
                Edit {authorActionsType}
              </EditButton>
            )}
            <DeleteButton className="p-4" onClick={onDelete}>
              Delete {authorActionsType}
            </DeleteButton>
          </div>
        </div>
      </div>
    </ModalsPortal>
  )
}

export default AuthorActionsModal
