import { disableBodyScroll, enableBodyScroll } from 'body-scroll-lock';
import { Message as MessageItem, useChatHistoryQuery } from 'lib/graphql';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import InfiniteScroll from 'react-infinite-scroller';
import { animateScroll as scroll } from 'react-scroll';
import { LoaderAnimation } from './LoaderAnimation';
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

  useLayoutEffect(() => {
    if (containerRef.current) console.log(containerRef.current.scrollHeight);
  }, [containerRef.current?.scrollHeight]);

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
    <InfiniteScroll
      loadMore={loadMore}
      hasMore={renderLoader && pageInfo.hasNextPage}
      loader={
        <div className="flex items-center">
          <LoaderAnimation loadingMessage="Loading messages" />
        </div>
      }
      isReverse
      className="flex flex-col m-3 space-y-4"
    >
      {messages.map(({ id }, index) => (
        <Message key={id} messageId={id} nextMessage={messages[index + 1] as MessageItem} />
      ))}
    </InfiniteScroll>
  );
};
