import { Chat, useChatsQuery } from 'lib/graphql'
import React from 'react'
import { ChatItem } from 'components/Chat/ChatItem'
import { ChatSkeleton } from 'components/Chat/ChatSkeleton'
import { InfiniteLoader } from 'components/InfiniteLoader'
import { NoResultFound } from './NoResultFound'

export const Inbox = () => {
  const { data, loading, fetchMore } = useChatsQuery()

  if (loading) {
    return <ChatSkeleton />
  }

  if (!data) {
    return <NoResultFound type="messages" />
  }

  const { nodes: chats, pageInfo } = data.chats

  const loadMore = async () => {
    await fetchMore({
      variables: {
        page: {
          after: pageInfo?.endCursor,
        },
      },
    })
  }

  return (
    <div>
      {chats.map((chat, index) => (
        <ChatItem key={index} chatItem={chat as Chat} />
      ))}
      {data && pageInfo?.hasNextPage && <InfiniteLoader loadMore={loadMore} loadingMessage="Loading Chats" />}
    </div>
  )
}
