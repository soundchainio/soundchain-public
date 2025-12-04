/* eslint-disable react/display-name */
import { LoaderAnimation } from 'components/LoaderAnimation'
import { Post } from 'components/Post/Post'
import { Song, useAudioPlayerContext } from 'hooks/useAudioPlayer'
import { FeedItem, useFeedQuery } from 'lib/graphql'
import { createContext, memo, useCallback, useContext, useEffect, useMemo, useRef } from 'react'
import PullToRefresh from 'react-simple-pull-to-refresh'
import AutoSizer from 'react-virtualized-auto-sizer'
import { areEqual, ListChildComponentProps, VariableSizeList as List } from 'react-window'
import InfiniteLoader from 'react-window-infinite-loader'
import { NoResultFound } from './NoResultFound'
import { PostFormTimeline } from './Post/PostFormTimeline'
import { PostSkeleton } from './Post/PostSkeleton'

interface FeedProps {
  pageSize?: number
}

const GAP = 8

interface FeedContextData {
  setSize: (index: number, height?: number | undefined) => void
  isItemLoaded: (index: number) => boolean
  handleOnPlayClicked: (trackId: string) => void
}

const FeedContext = createContext({} as FeedContextData)

export const Feed = ({ pageSize }: FeedProps) => {
  const { playlistState } = useAudioPlayerContext()
  pageSize = pageSize ?? 30 // Updated to 30 as per your change
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const listRef = useRef<any>(null)
  const { data, loading, fetchMore, refetch } = useFeedQuery({
    variables: { page: { first: pageSize } },
    ssr: false,
    errorPolicy: 'all', // Return partial data even if some fields have errors
  })
  const getSize = (index: number) => sizeMap[index] || 289
  const sizeMap = useMemo<{ [key: number]: number }>(() => ({}), [])
  const setSize = useCallback(
    (index: number, height?: number | undefined) => {
      const size = height || 0 // Handle undefined with default 0
      sizeMap[index] = size + GAP
      listRef?.current.resetAfterIndex(index)
    },
    []
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

  const handleOnPlayClicked = (trackId: string) => {
    if (nodes) {
      const listOfTracks = (nodes as FeedItem[])
        .filter(feedItem => feedItem?.post?.track && feedItem?.post?.track.deleted === false)
        .map(feedItem => {
          const trackFeedItem = feedItem?.post?.track
          if (trackFeedItem) {
            return {
              src: trackFeedItem.playbackUrl,
              trackId: trackFeedItem.id,
              art: trackFeedItem.artworkUrl,
              title: trackFeedItem.title,
              artist: trackFeedItem.artist,
              isFavorite: trackFeedItem.isFavorite,
            }
          }
        }) as Song[]
      const trackIndex = listOfTracks.findIndex(track => track.trackId === trackId)
      playlistState(listOfTracks, trackIndex)
    }
  }

  return (
    <FeedContext.Provider
      value={{
        setSize,
        handleOnPlayClicked,
        isItemLoaded,
      }}
    >
      <PostFormTimeline />
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
                  {ListItem}
                </List>
              )}
            </InfiniteLoader>
          )}
        </AutoSizer>
      </PullToRefresh>
    </FeedContext.Provider>
  )
}

const ListItem = memo(({ index, data, style }: ListChildComponentProps) => {
  const { isItemLoaded, setSize, handleOnPlayClicked } = useContext(FeedContext)

  return (
    <div style={style}>
      {!isItemLoaded(index) ? (
        <LoaderAnimation loadingMessage="Loading..." />
      ) : (
        <Row data={data as FeedItem[]} index={index} setSize={setSize} handleOnPlayClicked={handleOnPlayClicked} />
      )}
    </div>
  )
}, areEqual)

interface RowProps {
  data: FeedItem[]
  index: number
  setSize: (index: number, height?: number | undefined) => void
  handleOnPlayClicked: (trackId: string) => void
}

const Row = ({ data, index, setSize, handleOnPlayClicked }: RowProps) => {
  const rowRef = useRef<HTMLDivElement>(null)

  useEffect(() => setSize(index, rowRef?.current?.getBoundingClientRect().height), [setSize, index])

  if (!data[index]) {
    return null
  }

  return (
    <div ref={rowRef}>
      <Post key={data[index].post.id} post={data[index].post} handleOnPlayClicked={handleOnPlayClicked} />
    </div>
  )
}
