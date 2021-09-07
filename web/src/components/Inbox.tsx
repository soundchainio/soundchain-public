import { Chat, useChatsQuery } from 'lib/graphql';
import React from 'react';
import { ChatItem } from './ChatItem';
import { ChatSkeleton } from './ChatSkeleton';

export const Inbox = () => {
  const { data } = useChatsQuery();

  if (!data) {
    return <ChatSkeleton />;
  }

  return (
    <div>
      {data.chats.nodes.map((chat, index) => (
        <ChatItem key={index} chatItem={chat as Chat} />
      ))}
    </div>
  );
};
