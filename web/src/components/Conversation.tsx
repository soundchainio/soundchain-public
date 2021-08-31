import { Message as MessageItem, useConversationQuery } from 'lib/graphql';
import { useEffect, useRef, useState } from 'react';
import { CommentSkeleton } from './CommentSkeleton';
import { InfiniteLoader } from './InfiniteLoader';
import { Message } from './Message';

interface ConversationProps {
  profileId: string;
}

export const Conversation = ({ profileId }: ConversationProps) => {
  const endConversationRef = useRef<HTMLDivElement>(null);
  const [initialLoad, setInitialLoad] = useState(false);
  const { data, fetchMore } = useConversationQuery({
    variables: { profileId },
  });
  const conversation = data?.conversation.nodes;

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
    fetchMore({ variables: { profileId, page: { after: data?.conversation.pageInfo.startCursor } } });
  };

  return (
    <div className="flex flex-col m-3 space-y-4">
      {data && (
        <>
          {initialLoad && data.conversation.pageInfo.hasNextPage && <InfiniteLoader loadMore={loadMore} />}
          {data.conversation.nodes.map(({ id }, index) => (
            <Message key={id} messageId={id} nextMessage={data?.conversation.nodes[index + 1] as MessageItem} />
          ))}
          <div ref={endConversationRef}></div>
        </>
      )}
    </div>
  );
};
