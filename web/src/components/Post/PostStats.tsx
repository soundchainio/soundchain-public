import React from 'react'

import { Number } from 'components/Number'
import { useModalDispatch } from 'contexts/ModalContext'
import { ReactionEmoji } from 'icons/ReactionEmoji'
import { ReactionType } from 'lib/graphql'

interface PostStatsProps {
  totalReactions: number
  topReactions: ReactionType[]
  commentCount: number
  repostCount: number
  postId: string
}

const validatePlural = (word: string, qty: number) => {
  return <span className="ml-0.5 text-neutral-500">{word + (qty !== 1 ? 's' : '')}</span>
}

export const PostStats = ({ totalReactions, topReactions, commentCount, repostCount, postId }: PostStatsProps) => {
  const { dispatchReactionsModal, dispatchShowCommentModal } = useModalDispatch()
  const onReactions = () => {
    dispatchReactionsModal({ postId, top: topReactions, total: totalReactions })
  }

  const onCommentsClick = () => {
    dispatchShowCommentModal({ show: true, postId })
  }

  return (
    <div className="px-0 py-1.5">
      {/* Compact stats row - lighter weight than action buttons */}
      <div className="flex items-center gap-3 text-xs">
        <button className="flex items-center text-neutral-400 hover:text-neutral-200 transition-colors" onClick={onReactions}>
          {/* Show emoji stack */}
          {topReactions.length > 0 && (
            <div className="flex -space-x-1 mr-1.5">
              {topReactions.slice(0, 3).map((reaction, i) => (
                <span key={reaction} className="relative" style={{ zIndex: 3 - i }}>
                  <ReactionEmoji name={reaction} className="h-3.5 w-3.5" />
                </span>
              ))}
            </div>
          )}
          <span className="font-medium text-neutral-300">
            <Number value={totalReactions} />
          </span>
          {validatePlural('like', totalReactions)}
        </button>
        <span className="text-neutral-600">·</span>
        <button onClick={onCommentsClick} className="flex items-center text-neutral-400 hover:text-neutral-200 transition-colors">
          <span className="font-medium text-neutral-300">
            <Number value={commentCount} />
          </span>
          {validatePlural('comment', commentCount)}
        </button>
        <span className="text-neutral-600">·</span>
        <div className="flex items-center text-neutral-400">
          <span className="font-medium text-neutral-300">
            <Number value={repostCount} />
          </span>
          {validatePlural('repost', repostCount)}
        </div>
      </div>
    </div>
  )
}
