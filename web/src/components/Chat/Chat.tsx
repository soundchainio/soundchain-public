import { disableBodyScroll, enableBodyScroll } from 'body-scroll-lock'
import { useMountedState } from 'hooks/useMountedState'
import { Message as MessageItem, PageInfo } from 'lib/graphql'
import { MutableRefObject, useEffect, useRef, useState } from 'react'
import { InfiniteLoader } from '../InfiniteLoader'
import { Message } from '../Message'
import { MessageSkeleton } from '../MessageSkeleton'

interface ChatProps {
  messages: MessageItem[]
  pageInfo: PageInfo
  onFetchMore: () => void
  loading: boolean
  bottomRef: MutableRefObject<HTMLDivElement>
}

export const Chat = ({ messages, pageInfo, onFetchMore, loading, bottomRef }: ChatProps) => {
  const [renderLoader, setRenderLoader] = useState(false)
  const [lastContainerHeight, setLastContainerHeight] = useMountedState(0)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!renderLoader && messages.length > 0) initialScrollToBottom()
  }, [messages, renderLoader])

  useEffect(() => {
    if (!containerRef.current) return
    if (lastContainerHeight !== containerRef.current?.scrollHeight) {
      requestAnimationFrame(() => {
        if (!containerRef.current) return
        disableBodyScroll(containerRef.current)
        bottomRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        })
        requestAnimationFrame(() => {
          if (containerRef.current) enableBodyScroll(containerRef.current)
        })
      })
    }
    setLastContainerHeight(containerRef.current?.scrollHeight)
  }, [containerRef.current?.scrollHeight, lastContainerHeight])

  if (!messages) return <MessageSkeleton />

  const initialScrollToBottom = () => {
    requestAnimationFrame(() => {
      setTimeout(() => {
        bottomRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        })
      }, 1000)
      setTimeout(() => setRenderLoader(true), 1500)
    })
  }

  return (
    <div id="container" ref={containerRef}>
      {!loading && renderLoader && pageInfo.hasNextPage && (
        <InfiniteLoader loadMore={onFetchMore} loadingMessage="Loading messages" />
      )}
      <div className="m-3 mb-6 flex flex-col space-y-4">
        {messages.map(({ id }, index) => (
          <Message key={id} messageId={id} nextMessage={messages[index + 1] as MessageItem} />
        ))}
      </div>
      <div ref={bottomRef} />
    </div>
  )
}
