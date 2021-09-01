import { disableBodyScroll, enableBodyScroll } from 'body-scroll-lock';
import { Message as MessageItem, useChatHistoryQuery } from 'lib/graphql';
import { useEffect, useRef, useState } from 'react';
import { animateScroll as scroll } from 'react-scroll';
import { InfiniteLoader } from './InfiniteLoader';
import { Message } from './Message';
import { MessageSkeleton } from './MessageSkeleton';

interface ChatProps {
  profileId: string;
}

export const Chat = ({ profileId }: ChatProps) => {
  const [renderLoader, setRenderLoader] = useState(false);
  const [lastContainerHeight, setLastContainerHeight] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const { data, fetchMore } = useChatHistoryQuery({
    variables: { profileId },
  });

  useEffect(() => {
    if (!containerRef.current) return;
    if (lastContainerHeight !== containerRef.current?.scrollHeight) {
      requestAnimationFrame(() => {
        if (!containerRef.current) return;
        disableBodyScroll(containerRef.current);
        scroll.scrollTo(containerRef.current?.scrollHeight - lastContainerHeight, { duration: 0 });
        requestAnimationFrame(() => {
          if (containerRef.current) enableBodyScroll(containerRef.current);
        });
      });
    }
    setLastContainerHeight(containerRef.current?.scrollHeight);
  }, [containerRef.current?.scrollHeight, lastContainerHeight]);

  useEffect(() => {
    if (!renderLoader && data) initialScrollToBottom();
  }, [data, renderLoader]);

  if (!data) return <MessageSkeleton />;

  const { nodes: messages, pageInfo } = data.chatHistory;

  const initialScrollToBottom = () => {
    requestAnimationFrame(() => {
      setTimeout(() => scroll.scrollToBottom({ duration: 0 }), 100);
      setTimeout(() => setRenderLoader(true), 1000);
    });
  };

  const loadMore = async () => {
    await fetchMore({ variables: { profileId, page: { after: pageInfo.startCursor } } });
  };

  return (
    <div ref={containerRef}>
      {renderLoader && pageInfo.hasNextPage && <InfiniteLoader loadMore={loadMore} loadingMessage="Loading messages" />}
      <div className="flex flex-col m-3 space-y-4">
        {messages.map(({ id }, index) => (
          <Message key={id} messageId={id} nextMessage={messages[index + 1] as MessageItem} />
        ))}
      </div>
    </div>
  );
};
