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
  const containerRef = useRef<HTMLDivElement>(null);
  const { data, fetchMore } = useChatHistoryQuery({
    variables: { profileId },
  });
  const [lastHeight, setLastHeight] = useState(0);

  useEffect(() => {
    if (containerRef.current && lastHeight !== containerRef.current.scrollHeight) {
      scroll.scrollTo(containerRef.current?.scrollHeight - lastHeight, { duration: 0 });
      setLastHeight(containerRef.current?.scrollHeight);
    }
  }, [containerRef.current?.scrollHeight, lastHeight]);

  useEffect(() => {
    if (!renderLoader && data) initialScrollToBottom();
  }, [data, renderLoader]);

  if (!data) return <MessageSkeleton />;

  const { nodes: messages, pageInfo } = data.chatHistory;

  const initialScrollToBottom = () => {
    setTimeout(() => scroll.scrollToBottom({ duration: 0 }), 100);
    setTimeout(() => setRenderLoader(true), 2000);
  };

  const loadMore = async () => {
    if (containerRef.current) disableBodyScroll(containerRef.current);
    await fetchMore({ variables: { profileId, page: { after: pageInfo.startCursor } } });
    if (containerRef.current) enableBodyScroll(containerRef.current);
  };

  return (
    <>
      {renderLoader && pageInfo.hasNextPage && <InfiniteLoader loadMore={loadMore} loadingMessage="Loading messages" />}
      <div className="flex flex-col m-3 space-y-4" ref={containerRef}>
        {messages.map(({ id }, index) => (
          <Message key={id} messageId={id} nextMessage={messages[index + 1] as MessageItem} />
        ))}
      </div>
    </>
  );
};
