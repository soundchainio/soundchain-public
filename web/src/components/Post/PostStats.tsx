import React, { useEffect, useState } from 'react'

import { useModalDispatch } from 'contexts/ModalContext'
import { useMe } from 'hooks/useMe'
import { ReactionEmoji } from 'icons/ReactionEmoji'
import { ReactionType } from 'lib/graphql'
import {
  useChangeReactionMutation,
  useReactToPostMutation,
  useRetractReactionMutation,
  useGuestReactToPostMutation,
} from 'lib/graphql-hooks'

interface ReactionTally {
  type: ReactionType
  count: number
}

interface PostStatsProps {
  totalReactions: number
  topReactions: ReactionType[]
  reactionTally?: ReactionTally[]
  postId: string
  myReaction?: ReactionType | null
}

export const PostStats = ({ totalReactions, topReactions, reactionTally, postId, myReaction }: PostStatsProps) => {
  const { dispatchReactionsModal } = useModalDispatch()
  const me = useMe()
  const [guestWallet, setGuestWallet] = useState<string | null>(null)

  // Reaction mutations
  const [reactToPost, { loading: reacting }] = useReactToPostMutation()
  const [changeReaction, { loading: changing }] = useChangeReactionMutation()
  const [retractReaction, { loading: retracting }] = useRetractReactionMutation()
  const [guestReactToPost, { loading: guestReacting }] = useGuestReactToPostMutation()

  const isLoading = reacting || changing || retracting || guestReacting

  // Check for guest wallet on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && !me) {
      const savedWallet = localStorage.getItem('connectedWalletAddress')
      if (savedWallet) {
        setGuestWallet(savedWallet)
      }
    }
  }, [me])

  const isGuest = !me && !!guestWallet

  const onReactions = () => {
    dispatchReactionsModal({ postId, top: topReactions, total: totalReactions })
  }

  // Click to react with that emoji
  const handlePillClick = async (type: ReactionType, e: React.MouseEvent) => {
    e.stopPropagation() // Don't open modal
    if (isLoading) return

    // Guest reaction with wallet
    if (isGuest && guestWallet) {
      await guestReactToPost({
        variables: { input: { postId, type }, walletAddress: guestWallet },
        refetchQueries: ['Post', 'Posts', 'Feed'],
      })
      return
    }

    // Anonymous reaction - generate random wallet
    if (!me && !guestWallet) {
      const hexChars = '0123456789abcdef'
      let addressBody = ''
      for (let i = 0; i < 40; i++) {
        addressBody += hexChars[Math.floor(Math.random() * 16)]
      }
      const anonymousAddress = `0x${addressBody}`
      await guestReactToPost({
        variables: { input: { postId, type }, walletAddress: anonymousAddress },
        refetchQueries: ['Post', 'Posts', 'Feed'],
      })
      return
    }

    // Logged-in user reactions
    if (type === myReaction) {
      // Clicking same reaction = remove it
      await retractReaction({
        variables: { input: { postId } },
        refetchQueries: ['Post', 'Posts', 'Feed'],
      })
    } else if (myReaction) {
      // Change to different reaction
      await changeReaction({
        variables: { input: { postId, type } },
        refetchQueries: ['Post', 'Posts', 'Feed'],
      })
    } else {
      // Add new reaction
      await reactToPost({
        variables: { input: { postId, type } },
        refetchQueries: ['Post', 'Posts', 'Feed'],
      })
    }
  }

  // Discord-style tally: show each emoji with its count
  const hasTally = reactionTally && reactionTally.length > 0

  // Don't render anything if no reactions
  if (!hasTally && totalReactions === 0) return null

  return (
    <div className="px-0 py-1.5">
      {/* Pure emoji tally dashboard - click pill to react, long press for who reacted */}
      <div className="flex items-center gap-2">
        {hasTally ? (
          // Discord-style: each emoji with its count - clickable to react
          reactionTally.map(({ type, count }) => {
            const isMyReaction = type === myReaction
            return (
              <button
                key={type}
                onClick={(e) => handlePillClick(type, e)}
                disabled={isLoading}
                className={`flex items-center gap-1 px-2 py-1 rounded-full transition-all duration-200 ${
                  isMyReaction
                    ? 'bg-cyan-500/30 ring-1 ring-cyan-500/50 scale-105'
                    : 'bg-neutral-800/50 hover:bg-neutral-700/70 hover:scale-105'
                } ${isLoading ? 'opacity-50 cursor-wait' : 'cursor-pointer active:scale-95'}`}
                title={isMyReaction ? 'Click to remove' : 'Click to react'}
              >
                <ReactionEmoji name={type} className="h-4 w-4" />
                <span className={`font-medium text-xs ${isMyReaction ? 'text-cyan-300' : 'text-neutral-300'}`}>
                  {count}
                </span>
              </button>
            )
          })
        ) : (
          // Fallback: stacked emojis with total (clickable to open modal)
          <button
            className="flex items-center gap-2.5 text-neutral-400 hover:text-neutral-200 transition-colors"
            onClick={onReactions}
          >
            <div className="flex -space-x-1">
              {topReactions.slice(0, 3).map((reaction, i) => (
                <span key={reaction} className="relative" style={{ zIndex: 3 - i }}>
                  <ReactionEmoji name={reaction} className="h-4 w-4" />
                </span>
              ))}
            </div>
            <span className="font-medium text-neutral-300 text-xs">{totalReactions}</span>
          </button>
        )}
        {/* Total count - click to see all who reacted */}
        {hasTally && totalReactions > 0 && (
          <button
            onClick={onReactions}
            className="text-xs text-neutral-500 hover:text-neutral-300 transition-colors ml-1"
            title="See all reactions"
          >
            {totalReactions} total
          </button>
        )}
      </div>
    </div>
  )
}
