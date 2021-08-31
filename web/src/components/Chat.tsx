import { Message as MessageItem, useChatQuery } from 'lib/graphql';
import { useEffect, useRef, useState } from 'react';
import { CommentSkeleton } from './CommentSkeleton';
import { InfiniteLoader } from './InfiniteLoader';
import { Message } from './Message';

interface ConversationProps {
  profileId: string;
}

export const Chat = ({ profileId }: ConversationProps) => {
  const endConversationRef = useRef<HTMLDivElement>(null);
  const [initialLoad, setInitialLoad] = useState(false);
  const { data, fetchMore } = useChatQuery({
    variables: { profileId },
  });
  const conversation = data?.chat.nodes;

  useEffect(() => {
    if (data && !initialLoad) {
      scrollToBottom();
      setTimeout(() => setInitialLoad(true), 1000);
    }
  }, [data, endConversationRef, initialLoad]);

  if (!conversation) return <CommentSkeleton />;

  const scrollToBottom = () => {
    endConversationRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadMore = () => {
    fetchMore({ variables: { profileId, page: { after: data?.chat.pageInfo.startCursor } } });
  };

  return (
    <div className="flex flex-col m-3 space-y-4">
      {data && (
        <>
          {initialLoad && data.chat.pageInfo.hasNextPage && <InfiniteLoader loadMore={loadMore} />}
          {data.chat.nodes.map(({ id }, index) => (
            <Message key={id} messageId={id} nextMessage={data?.chat.nodes[index + 1] as MessageItem} />
          ))}
          <div ref={endConversationRef}></div>
        </>
      )}
    </div>
  );
};
