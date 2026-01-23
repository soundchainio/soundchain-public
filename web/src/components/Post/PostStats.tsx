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
  // Discord-style reaction breakdown (emoji -> count)
  reactionCounts?: Record<ReactionType, number>
}

const validatePlural = (word: string, qty: number) => {
  return <span className="ml-0.5 text-neutral-500">{word + (qty !== 1 ? 's' : '')}</span>
}

export const PostStats = ({ totalReactions, topReactions, commentCount, repostCount, postId, reactionCounts }: PostStatsProps) => {
  const { dispatchReactionsModal, dispatchShowCommentModal } = useModalDispatch()
  const onReactions = () => {
    dispatchReactionsModal({ postId, top: topReactions, total: totalReactions })
  }

  const onCommentsClick = () => {
    dispatchShowCommentModal({ show: true, postId })
  }

  // Check if we have any reactions to show Discord-style tally
  const hasReactionTally = reactionCounts && Object.values(reactionCounts).some(count => count > 0)

  return (
    <div className="px-0 py-1.5">
      {/* Discord-style emoji tally row - only show if there are reactions */}
      {hasReactionTally && reactionCounts && (
        <div className="flex items-center gap-1.5 mb-2 flex-wrap">
          {Object.entries(reactionCounts)
            .filter(([_, count]) => count > 0)
            .sort(([, a], [, b]) => b - a) // Sort by count descending
            .map(([reaction, count]) => (
              <button
                key={reaction}
                onClick={onReactions}
                className="inline-flex items-center gap-1 px-2 py-1 bg-neutral-800/80 hover:bg-neutral-700 border border-neutral-700/50 rounded-full transition-all duration-200 group"
              >
                {/* Emoji with sparkle effect */}
                <span className="relative">
                  <ReactionEmoji name={reaction as ReactionType} className="h-4 w-4 transition-transform group-hover:scale-110" />
                  {/* Subtle sparkle overlay */}
                  <span className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-full" />
                </span>
                <span className="text-xs font-medium text-neutral-300 tabular-nums">{count}</span>
              </button>
            ))}
        </div>
      )}

      {/* Compact stats row - lighter weight than action buttons */}
      <div className="flex items-center gap-3 text-xs">
        <button className="flex items-center text-neutral-400 hover:text-neutral-200 transition-colors" onClick={onReactions}>
          {/* Show emoji stack if no tally breakdown */}
          {!hasReactionTally && topReactions.length > 0 && (
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
