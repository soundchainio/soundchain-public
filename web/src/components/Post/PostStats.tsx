import React from 'react'

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
  postId: string
}

export const PostStats = ({ totalReactions, topReactions, reactionTally, postId }: PostStatsProps) => {
  const { dispatchReactionsModal } = useModalDispatch()
  const onReactions = () => {
    dispatchReactionsModal({ postId, top: topReactions, total: totalReactions })
  }

  // Discord-style tally: show each emoji with its count
  const hasTally = reactionTally && reactionTally.length > 0

  // Don't render anything if no reactions
  if (!hasTally && totalReactions === 0) return null

  return (
    <div className="px-0 py-1.5">
      {/* Pure emoji tally dashboard - click to see who reacted */}
      <button
        className="flex items-center gap-2.5 text-neutral-400 hover:text-neutral-200 transition-colors"
        onClick={onReactions}
      >
        {hasTally ? (
          // Discord-style: each emoji with its count
          reactionTally.map(({ type, count }) => (
            <span key={type} className="flex items-center gap-1 bg-neutral-800/50 px-2 py-1 rounded-full">
              <ReactionEmoji name={type} className="h-4 w-4" />
              <span className="font-medium text-neutral-300 text-xs">{count}</span>
            </span>
          ))
        ) : (
          // Fallback: stacked emojis with total
          <>
            <div className="flex -space-x-1">
              {topReactions.slice(0, 3).map((reaction, i) => (
                <span key={reaction} className="relative" style={{ zIndex: 3 - i }}>
                  <ReactionEmoji name={reaction} className="h-4 w-4" />
                </span>
              ))}
            </div>
            <span className="font-medium text-neutral-300 text-xs">{totalReactions}</span>
          </>
        )}
      </button>
    </div>
  )
}
