import React, { useEffect, useRef, useState } from 'react'
import { X, ChevronDown, ChevronUp } from 'lucide-react'
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
  const [isCollapsed, setIsCollapsed] = useState(false)

  const firstPage: PageInput = { first: pageSize }

  const { data, loading, error, refetch, fetchMore } = useCommentsQuery({
    variables: { postId: commentModalPostId || '', page: firstPage },
    skip: !commentModalPostId,
    fetchPolicy: 'network-only',
  })

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

  if (!commentModalPostId) return null

  const comments = data?.comments.nodes || []
  const pageInfo = data?.comments.pageInfo
  const commentCount = comments.length

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
      {/* Mini accordion popup - centered with feed on desktop, full-width bottom sheet on mobile */}
      <div
        ref={modalRef}
        className="fixed z-50 bg-neutral-900 shadow-2xl border border-neutral-700 flex flex-col overflow-hidden transition-all duration-200
          bottom-0 left-0 right-0 w-full rounded-t-xl
          sm:bottom-4 sm:left-1/2 sm:-translate-x-1/2 sm:w-[420px] sm:rounded-xl sm:max-w-[calc(100%-2rem)]"
        style={{ maxHeight: isCollapsed ? '48px' : '70vh' }}
      >
        {/* Collapsible Header - click to toggle */}
        <div
          className="flex items-center justify-between px-3 py-2.5 border-b border-neutral-800 cursor-pointer hover:bg-neutral-800/50 transition-colors"
          onClick={() => setIsCollapsed(!isCollapsed)}
        >
          <div className="flex items-center gap-2">
            <span className="text-white font-medium text-sm">Comments</span>
            {commentCount > 0 && (
              <span className="text-xs text-neutral-400 bg-neutral-800 px-1.5 py-0.5 rounded-full">
                {commentCount}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={(e) => {
                e.stopPropagation()
                setIsCollapsed(!isCollapsed)
              }}
              className="p-1 rounded hover:bg-neutral-700 transition-colors"
            >
              {isCollapsed ? (
                <ChevronUp className="w-4 h-4 text-neutral-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-neutral-400" />
              )}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                handleClose()
              }}
              className="p-1 rounded hover:bg-neutral-700 transition-colors"
            >
              <X className="w-4 h-4 text-neutral-400" />
            </button>
          </div>
        </div>

        {/* Expandable Content */}
        {!isCollapsed && (
          <>
            {/* Comments List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3 max-h-[50vh] sm:max-h-[300px]">
              {error ? (
                <div className="text-center py-4">
                  <p className="text-red-400 text-sm">Error loading comments</p>
                  <button
                    onClick={() => refetch()}
                    className="mt-1 px-3 py-1 bg-cyan-500/20 text-cyan-400 rounded text-xs"
                  >
                    Retry
                  </button>
                </div>
              ) : loading && !data ? (
                <>
                  <CommentSkeleton />
                  <CommentSkeleton />
                </>
              ) : comments.length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-neutral-500 text-sm">No comments yet</p>
                  <p className="text-neutral-600 text-xs mt-0.5">Be the first!</p>
                </div>
              ) : (
                <>
                  {comments.map(({ id }) => (
                    <Comment key={id} commentId={id} />
                  ))}
                  {pageInfo?.hasNextPage && (
                    <button
                      onClick={loadMore}
                      className="w-full py-1.5 text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
                    >
                      Load more
                    </button>
                  )}
                </>
              )}
            </div>

            {/* Comment Form */}
            <div className="border-t border-neutral-800 p-2 bg-neutral-900/95">
              <NewCommentForm postId={commentModalPostId} onSuccess={() => {}} compact />
            </div>
          </>
        )}
      </div>
    </ModalsPortal>
  )
}

export default CommentModal
