import { Chat, useChatsQuery } from 'lib/graphql';
import React, { useEffect } from 'react';
import { ChatItem } from './ChatItem';
import { NotificationSkeleton } from './NotificationSkeleton';

export const Inbox = () => {
  const { data } = useChatsQuery();
  useEffect(() => {
    console.log(data);
  }, [data]);
  if (!data) {
    return <NotificationSkeleton />;
  }

  return (
    <div>
      {data.chats.nodes.map((chat, index) => (
        <ChatItem key={index} chatItem={chat as Chat} />
      ))}
    </div>
  );
};
