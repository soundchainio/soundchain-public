import React from 'react'

import { Number } from 'components/Number'
import { useModalDispatch } from 'contexts/ModalContext'
import { ReactionEmoji } from 'icons/ReactionEmoji'
import { ReactionType } from 'lib/graphql'

interface ReactionTally {
  type: ReactionType
  count: number
}

interface PostStatsProps {
  totalReactions: number
  topReactions: ReactionType[]
  reactionTally?: ReactionTally[]
  commentCount: number
  repostCount: number
  postId: string
}

const validatePlural = (word: string, qty: number) => {
  return <span className="ml-0.5 text-neutral-500">{word + (qty !== 1 ? 's' : '')}</span>
}

export const PostStats = ({ totalReactions, topReactions, reactionTally, commentCount, repostCount, postId }: PostStatsProps) => {
  const { dispatchReactionsModal, dispatchShowCommentModal } = useModalDispatch()
  const onReactions = () => {
    dispatchReactionsModal({ postId, top: topReactions, total: totalReactions })
  }

  const onCommentsClick = () => {
    dispatchShowCommentModal({ show: true, postId })
  }

  // Discord-style tally: show each emoji with its count
  const hasTally = reactionTally && reactionTally.length > 0

  return (
    <div className="px-0 py-1.5">
      {/* Compact stats row - lighter weight than action buttons */}
      <div className="flex items-center gap-3 text-xs">
        <button className="flex items-center text-neutral-400 hover:text-neutral-200 transition-colors" onClick={onReactions}>
          {/* Discord-style tally bar: emoji + count for each */}
          {hasTally ? (
            <div className="flex items-center gap-2">
              {reactionTally.map(({ type, count }) => (
                <span key={type} className="flex items-center gap-0.5">
                  <ReactionEmoji name={type} className="h-4 w-4" />
                  <span className="font-medium text-neutral-300 text-xs">{count}</span>
                </span>
              ))}
            </div>
          ) : (
            <>
              {/* Fallback to stacked emojis if no tally */}
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
            </>
          )}
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
