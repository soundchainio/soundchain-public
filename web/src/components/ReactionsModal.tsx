import { useModalDispatch, useModalState } from 'contexts/ModalContext'
import { DownArrow } from 'icons/DownArrow'
import { ReactionEmoji } from 'icons/ReactionEmoji'
import { Reaction, ReactionType, useReactionsLazyQuery } from 'lib/graphql'
import React, { useEffect } from 'react'
import { InfiniteLoader } from 'components/InfiniteLoader'
import { LoaderAnimation } from 'components/LoaderAnimation'
import { Modal } from './Modal'
import { ReactionItem } from './ReactionItem'

export const ReactionsModal = () => {
  const modalState = useModalState()
  const reactions = modalState?.reactions || { postId: undefined, show: false, top: [], total: 0 }
  const { postId, show, top, total } = reactions
  
  const [reactionsData, { data, fetchMore }] = useReactionsLazyQuery()
  const { dispatchReactionsModal } = useModalDispatch()

  useEffect(() => {
    if (show && postId) {
      reactionsData({ variables: { postId } })
    }
  }, [show, postId, reactionsData])

  const onLoadMore = () => {
    if (fetchMore) {
      fetchMore({ variables: { postId, page: { after: data?.reactions.pageInfo.endCursor } } })
    }
  }

  const onClose = () => {
    dispatchReactionsModal({ postId: undefined })
  }

  const getTitle = () => {
    return (
      <div className="flex flex-row items-center justify-center self-center">
        {top?.map((reaction: ReactionType, index: number) => (
          <ReactionEmoji key={`${reaction}-${index}`} name={reaction} className="mr-2 h-4 w-4" />
        ))}
        <span className="pr-2">{total}</span>
        <div className="text-sm font-normal text-gray-60">reaction{total && total > 1 ? 's' : null}</div>
      </div>
    )
  }

  return (
    <Modal
      show={show}
      title={getTitle()}
      leftButton={
        <div className="ml-6 flex justify-start">
          <button aria-label="Close" className="flex h-10 w-10 items-center justify-center" onClick={onClose}>
            <DownArrow />
          </button>
        </div>
      }
      onClose={onClose}
    >
      <div className="h-full bg-gray-25">
        {!data && (
          <div className="flex items-center">
            <LoaderAnimation loadingMessage="Loading Reactions" />
          </div>
        )}
        <div>
          {data?.reactions.nodes.map(reaction => (
            <ReactionItem key={reaction.id} reaction={reaction as Reaction} onClick={onClose} />
          ))}
        </div>
        {data?.reactions.pageInfo.hasNextPage && (
          <InfiniteLoader loadMore={onLoadMore} loadingMessage="Loading Followers" />
        )}
      </div>
    </Modal>
  )
}

export default ReactionsModal