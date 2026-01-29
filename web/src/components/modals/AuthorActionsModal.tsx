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
import { ModalsPortal } from '../ModalsPortal'
import { Pencil, Trash2, X } from 'lucide-react'

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
        dispatchShowPostModal({ show: true })
        break
      case AuthorActionsType.COMMENT:
        dispatchSetEditCommentId(authorActionsId)
        dispatchShowCommentModal({ show: true })
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

  // Don't render anything if not showing - prevents click interception
  if (!showAuthorActions) return null

  const actionLabel = authorActionsType === AuthorActionsType.POST ? 'Post'
    : authorActionsType === AuthorActionsType.COMMENT ? 'Comment'
    : authorActionsType === AuthorActionsType.NFT ? 'NFT'
    : 'Edition'

  return (
    <ModalsPortal>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onOutsideClick}
      />

      {/* Modal - centered on desktop, bottom sheet on mobile */}
      <div className="fixed z-50 bottom-0 left-0 right-0 sm:bottom-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:max-w-xs sm:w-full animate-in slide-in-from-bottom sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200">
        <div className="bg-neutral-900 border border-neutral-700 rounded-t-2xl sm:rounded-2xl overflow-hidden shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-800">
            <span className="text-white font-medium text-sm">{actionLabel} Options</span>
            <button
              onClick={onOutsideClick}
              className="p-1 rounded-full hover:bg-neutral-800 transition-colors"
            >
              <X className="w-4 h-4 text-neutral-400" />
            </button>
          </div>

          {/* Actions */}
          <div className="p-2">
            {!showOnlyDeleteOption && (
              <button
                onClick={onEdit}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-neutral-800 transition-colors group"
              >
                <div className="w-10 h-10 rounded-full bg-cyan-500/20 flex items-center justify-center">
                  <Pencil className="w-5 h-5 text-cyan-400" />
                </div>
                <div className="text-left">
                  <p className="text-white font-medium">Edit {actionLabel}</p>
                  <p className="text-neutral-500 text-xs">Modify content</p>
                </div>
              </button>
            )}

            <button
              onClick={onDelete}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-red-500/10 transition-colors group"
            >
              <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-red-400" />
              </div>
              <div className="text-left">
                <p className="text-red-400 font-medium">Delete {actionLabel}</p>
                <p className="text-neutral-500 text-xs">Permanently remove</p>
              </div>
            </button>
          </div>

          {/* Cancel button for mobile */}
          <div className="p-2 pt-0 sm:hidden">
            <button
              onClick={onOutsideClick}
              className="w-full py-3 rounded-xl bg-neutral-800 text-neutral-300 font-medium hover:bg-neutral-700 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </ModalsPortal>
  )
}

export default AuthorActionsModal
