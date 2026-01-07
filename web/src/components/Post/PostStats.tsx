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
  return <div className="ml-1 text-gray-400">{word + (qty !== 1 ? 's' : '')}</div>
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
    <div className="mt-2 px-0 py-2">
      <div className="flex items-center gap-4">
        <button className="flex items-center text-sm text-gray-100" onClick={onReactions}>
          <div className="flex space-x-1">
            {topReactions.map(reaction => (
              <ReactionEmoji key={reaction} name={reaction} className="h-4 w-4" />
            ))}
          </div>
          <div className="pl-2 font-bold text-white">
            <Number value={totalReactions} />
          </div>
          {validatePlural('like', totalReactions)}
        </button>
        <button onClick={onCommentsClick} className="flex items-center text-sm text-gray-100 hover:text-white transition-colors">
          <div className="font-bold text-white">
            <Number value={commentCount} />
          </div>
          {validatePlural('comment', commentCount)}
        </button>
        <div className="flex items-center text-sm text-gray-100">
          <div className="font-bold text-white">
            <Number value={repostCount} />
          </div>
          {validatePlural('repost', repostCount)}
        </div>
      </div>
    </div>
  )
}
