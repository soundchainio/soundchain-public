import { Message as MessageItem, useChatQuery } from 'lib/graphql';
import { useEffect, useRef, useState } from 'react';
import { InfiniteLoader } from './InfiniteLoader';
import { Message } from './Message';
import { MessageSkeleton } from './MessageSkeleton';

interface ConversationProps {
  profileId: string;
}

export const Chat = ({ profileId }: ConversationProps) => {
  const endConversationRef = useRef<HTMLDivElement>(null);
  const [initialLoad, setInitialLoad] = useState(false);
  const { data, fetchMore } = useChatQuery({
    variables: { profileId },
  });

  useEffect(() => {
    if (data && endConversationRef.current && !initialLoad) {
      scrollToBottom();
    }
  }, [data, initialLoad, endConversationRef]);

  if (!data) return <MessageSkeleton />;

  const { nodes: messages, pageInfo } = data.chat;

  const scrollToBottom = () => {
    endConversationRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(() => setInitialLoad(true), 2000);
  };

  const loadMore = () => {
    fetchMore({ variables: { profileId, page: { after: pageInfo.startCursor } } });
  };

  return (
    <>
      {initialLoad && pageInfo.hasNextPage && <InfiniteLoader loadMore={loadMore} loadingMessage="Loading messages" />}
      <div className="flex flex-col m-3 space-y-4">
        {messages.map(({ id }, index) => (
          <Message key={id} messageId={id} nextMessage={messages[index + 1] as MessageItem} />
        ))}
      </div>
      <div ref={endConversationRef}></div>
    </>
  );
};
