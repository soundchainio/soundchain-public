import React, { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { useModalDispatch, useModalState } from 'contexts/ModalContext'
import { useCommentsQuery, PageInput } from 'lib/graphql'
import { Comment } from './Comment'
import { CommentSkeleton } from './CommentSkeleton'
import { NewCommentForm } from '../NewCommentForm'
import { ModalsPortal } from '../ModalsPortal'

const pageSize = 20

export const CommentModal = () => {
  const { commentModalPostId } = useModalState()
  const { dispatchShowCommentModal } = useModalDispatch()
  const modalRef = useRef<HTMLDivElement>(null)

  const firstPage: PageInput = { first: pageSize }

  const { data, loading, error, refetch, fetchMore } = useCommentsQuery({
    variables: { postId: commentModalPostId || '', page: firstPage },
    skip: !commentModalPostId,
    fetchPolicy: 'network-only', // Always fetch fresh data
  })

  // Debug logging
  console.log('[CommentModal] postId:', commentModalPostId, 'loading:', loading, 'error:', error, 'data:', data?.comments?.nodes?.length)

  const handleClose = () => {
    dispatchShowCommentModal({ show: false, postId: undefined })
  }

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose()
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [])

  // Close on click outside
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) handleClose()
  }

  if (!commentModalPostId) return null

  const comments = data?.comments.nodes || []
  const pageInfo = data?.comments.pageInfo

  const loadMore = () => {
    if (pageInfo?.hasNextPage && fetchMore) {
      fetchMore({
        variables: {
          page: {
            first: pageSize,
            after: pageInfo.endCursor,
            inclusive: false,
          },
        },
      })
    }
  }

  return (
    <ModalsPortal>
      <div
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm"
        onClick={handleBackdropClick}
      >
        <div
          ref={modalRef}
          className="bg-neutral-900 w-full sm:w-[500px] max-h-[60vh] sm:max-h-[70vh] rounded-t-2xl sm:rounded-2xl flex flex-col overflow-hidden border border-neutral-800"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-800">
            <h2 className="text-white font-semibold text-lg">Comments</h2>
            <button
              onClick={handleClose}
              className="p-1.5 rounded-full hover:bg-neutral-800 transition-colors"
            >
              <X className="w-5 h-5 text-neutral-400" />
            </button>
          </div>

          {/* Comments List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {error ? (
              <div className="text-center py-8">
                <p className="text-red-400">Error loading comments</p>
                <p className="text-neutral-600 text-sm mt-1">{error.message}</p>
                <button
                  onClick={() => refetch()}
                  className="mt-2 px-4 py-2 bg-cyan-500/20 text-cyan-400 rounded-lg text-sm"
                >
                  Try again
                </button>
              </div>
            ) : loading && !data ? (
              <>
                <CommentSkeleton />
                <CommentSkeleton />
                <CommentSkeleton />
              </>
            ) : comments.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-neutral-500">No comments yet</p>
                <p className="text-neutral-600 text-sm mt-1">Be the first to comment!</p>
              </div>
            ) : (
              <>
                {comments.map(({ id }) => (
                  <Comment key={id} commentId={id} />
                ))}
                {pageInfo?.hasNextPage && (
                  <button
                    onClick={loadMore}
                    className="w-full py-2 text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
                  >
                    Load more comments
                  </button>
                )}
              </>
            )}
          </div>

          {/* Comment Form */}
          <div className="border-t border-neutral-800 p-3 bg-neutral-900/95">
            <NewCommentForm postId={commentModalPostId} onSuccess={handleClose} compact />
          </div>
        </div>
      </div>
    </ModalsPortal>
  )
}

export default CommentModal
