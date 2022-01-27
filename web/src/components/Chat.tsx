import { disableBodyScroll, enableBodyScroll } from 'body-scroll-lock';
import { useMountedState } from 'hooks/useMountedState';
import { Message as MessageItem, PageInfo } from 'lib/graphql';
import { useEffect, useRef, useState } from 'react';
import { animateScroll as scroll } from 'react-scroll';
import { InfiniteLoader } from './InfiniteLoader';
import { Message } from './Message';
import { MessageSkeleton } from './MessageSkeleton';

interface ChatProps {
  messages: MessageItem[];
  pageInfo: PageInfo;
  onFetchMore: () => void;
  loading: boolean;
}

export const Chat = ({ messages, pageInfo, onFetchMore, loading }: ChatProps) => {
  const [renderLoader, setRenderLoader] = useState(false);
  const [lastContainerHeight, setLastContainerHeight] = useMountedState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!renderLoader && messages) initialScrollToBottom();
  }, [messages, renderLoader]);

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

  if (!messages) return <MessageSkeleton />;

  const initialScrollToBottom = () => {
    requestAnimationFrame(() => {
      setTimeout(() => scroll.scrollToBottom({ duration: 0 }), 100);
      setTimeout(() => setRenderLoader(true), 1000);
    });
  };

  return (
    <div id="container" ref={containerRef}>
      {!loading && renderLoader && pageInfo.hasNextPage && (
        <InfiniteLoader loadMore={onFetchMore} loadingMessage="Loading messages" />
      )}
      <div className="flex flex-col m-3 mb-6 space-y-4">
        {messages.map(({ id }, index) => (
          <Message key={id} messageId={id} nextMessage={messages[index + 1] as MessageItem} />
        ))}
      </div>
    </div>
  );
};
