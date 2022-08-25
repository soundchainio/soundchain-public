/* eslint-disable react/display-name */
import { Post } from 'components/Post'
import { FeedItem, useFeedQuery } from 'lib/graphql'
import PullToRefresh from 'react-simple-pull-to-refresh'
import { areEqual, VariableSizeList as List } from 'react-window'
import AutoSizer from 'react-virtualized-auto-sizer'
import InfiniteLoader from 'react-window-infinite-loader'
import { NoResultFound } from './NoResultFound'
import { PostSkeleton } from './PostSkeleton'
import { memo, useCallback, useEffect, useMemo, useRef } from 'react'
import { LoaderAnimation } from './LoaderAnimation'

interface FeedProps {
  pageSize?: number
}

const GAP = 8

export const Feed = ({ pageSize }: FeedProps) => {
  pageSize = pageSize ?? 10
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const listRef = useRef<any>(null)
  const { data, loading, fetchMore, refetch } = useFeedQuery({ variables: { page: { first: pageSize } }, ssr: false })
  const getSize = (index: number) => sizeMap[index] || 289
  const sizeMap = useMemo<{ [key: number]: number }>(() => ({}), [])
  const setSize = useCallback(
    (index, size) => {
      sizeMap[index] = size + GAP
      listRef?.current.resetAfterIndex(index)
    },
    [sizeMap],
  )

  if (loading) {
    return (
      <div className="space-y-2">
        <PostSkeleton />
        <PostSkeleton />
        <PostSkeleton />
      </div>
    )
  }

  if (!data) {
    return <NoResultFound type="posts" />
  }

  const { nodes, pageInfo } = data.feed

  const loadMore = () => {
    fetchMore({
      variables: {
        page: {
          first: pageSize,
          after: pageInfo.endCursor,
        },
      },
    })
  }

  const loadMoreItems = loading ? () => null : loadMore
  const isItemLoaded = (index: number) => !pageInfo.hasNextPage || index < nodes.length
  const feedCount = pageInfo.hasNextPage ? nodes.length + 1 : nodes.length

  return (
    <PullToRefresh onRefresh={refetch}>
      <AutoSizer>
        {({ height, width }) => (
          <InfiniteLoader isItemLoaded={isItemLoaded} itemCount={feedCount} loadMoreItems={loadMoreItems}>
            {({ onItemsRendered, ref }) => (
              <List
                height={height}
                width={width}
                onItemsRendered={onItemsRendered}
                ref={list => {
                  typeof ref === 'function' && ref(list)
                  listRef.current = list
                }}
                itemCount={feedCount}
                itemSize={getSize}
                itemData={nodes}
              >
                {memo(
                  ({ data, index, style }) => (
                    <div style={style}>
                      {!isItemLoaded(index) ? (
                        <LoaderAnimation loadingMessage="Loading..." />
                      ) : (
                        <Row data={data as FeedItem[]} index={index} setSize={setSize} />
                      )}
                    </div>
                  ),
                  areEqual,
                )}
              </List>
            )}
          </InfiniteLoader>
        )}
      </AutoSizer>
    </PullToRefresh>
  )
}

interface RowProps {
  data: FeedItem[]
  index: number
  setSize: (index: number, height?: number) => void
}

const Row = ({ data, index, setSize }: RowProps) => {
  const rowRef = useRef<HTMLDivElement>(null)

  useEffect(() => setSize(index, rowRef?.current?.getBoundingClientRect().height), [setSize, index])

  if (!data[index]) {
    return null
  }

  return (
    <div ref={rowRef}>
      <Post key={data[index].post.id} post={data[index].post} />
    </div>
  )
}
