/* eslint-disable react/display-name */
import { LoaderAnimation } from 'components/LoaderAnimation'
import { NoResultFound } from 'components/NoResultFound'
import { Post } from './Post'
import { CompactPost } from './CompactPost'
import { Song, useAudioPlayerContext } from 'hooks/useAudioPlayer'
import { Post as PostType, usePostsQuery, SortOrder, SortPostField } from 'lib/graphql'
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import PullToRefresh from 'react-simple-pull-to-refresh'
import AutoSizer from 'react-virtualized-auto-sizer'
import { areEqual, VariableSizeList as List, FixedSizeGrid as Grid } from 'react-window'
import InfiniteLoader from 'react-window-infinite-loader'
import { PostFormTimeline } from './PostFormTimeline'
import { PostSkeleton } from './PostSkeleton'
import { LayoutGrid, List as ListIcon } from 'lucide-react'

interface PostsProps extends React.ComponentPropsWithoutRef<'div'> {
  profileId?: string
}

const pageSize = 30
const GAP = 8

type ViewMode = 'list' | 'grid'

export const Posts = ({ profileId }: PostsProps) => {
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const { playlistState } = useAudioPlayerContext()
  const { data, loading, refetch, fetchMore } = usePostsQuery({
    variables: {
      filter: profileId ? { profileId } : undefined,
      page: { first: pageSize },
      sort: { field: SortPostField.CreatedAt, order: SortOrder.Desc },
    },
    ssr: false,
    errorPolicy: 'all', // Return partial data even if some fields have errors
  })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const listRef = useRef<any>(null)
  const getSize = (index: number) => sizeMap[index] || 289
  const sizeMap = useMemo<{ [key: number]: number }>(() => ({}), [])
  const setSize = useCallback(
    (index: number, height?: number | undefined) => { // Updated to match RowProps
      const size = height || 0 // Handle undefined with default 0
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

  const { nodes, pageInfo } = data.posts

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
  const postsCount = pageInfo.hasNextPage ? nodes.length + 1 : nodes.length

  const handleOnPlayClicked = (trackId: string) => {
    if (nodes) {
      const listOfTracks = (nodes as PostType[])
        .filter(post => post.track && post.track.deleted === false)
        .map(post => {
          if (post.track) {
            return {
              src: post.track.playbackUrl,
              trackId: post.track.id,
              art: post.track.artworkUrl,
              title: post.track.title,
              artist: post.track.artist,
              isFavorite: post.track.isFavorite,
            }
          }
        }) as Song[]
      const trackIndex = listOfTracks.findIndex(track => track.trackId === trackId)
      playlistState(listOfTracks, trackIndex)
    }
  }

  // Grid cell renderer for compact view
  const GridCell = memo(({ columnIndex, rowIndex, style, data }: any) => {
    const itemIndex = rowIndex * 2 + columnIndex // 2 columns
    const posts = data.nodes
    if (itemIndex >= posts.length) return null

    const post = posts[itemIndex]
    if (!post) return null

    return (
      <div style={{ ...style, padding: '4px' }}>
        <CompactPost post={post} handleOnPlayClicked={data.handleOnPlayClicked} />
      </div>
    )
  })
  GridCell.displayName = 'GridCell'

  return (
    <>
      {/* Post Form */}
      <PostFormTimeline />

      {/* View Mode Toggle - Below post form, right aligned */}
      <div className="flex justify-end mb-3 px-2">
        <div className="flex items-center gap-1 bg-neutral-800/50 rounded-lg p-1">
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 rounded-md transition-colors ${viewMode === 'list' ? 'bg-cyan-500/20 text-cyan-400' : 'text-gray-400 hover:text-white'}`}
            title="List view"
          >
            <ListIcon className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-cyan-500/20 text-cyan-400' : 'text-gray-400 hover:text-white'}`}
            title="Grid view (compact)"
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
        </div>
      </div>

      <PullToRefresh onRefresh={refetch}>
        <AutoSizer>
          {({ height, width }) => (
            <InfiniteLoader isItemLoaded={isItemLoaded} itemCount={postsCount} loadMoreItems={loadMoreItems}>
              {({ onItemsRendered, ref }) => (
                viewMode === 'list' ? (
                  <List
                    height={height}
                    width={width}
                    onItemsRendered={onItemsRendered}
                    ref={list => {
                      typeof ref === 'function' && ref(list)
                      listRef.current = list
                    }}
                    itemCount={postsCount}
                    itemSize={getSize}
                    itemData={nodes}
                    overscanCount={5}
                  >
                    {memo(
                      ({ data, index, style }) => (
                        <div style={style}>
                          {!isItemLoaded(index) ? (
                            <LoaderAnimation loadingMessage="Loading..." />
                          ) : (
                            <Row
                              data={data as PostType[]}
                              index={index}
                              setSize={setSize}
                              handleOnPlayClicked={handleOnPlayClicked}
                            />
                          )}
                        </div>
                      ),
                      areEqual,
                    )}
                  </List>
                ) : (
                  // Grid view - 2 columns of compact cards
                  <Grid
                    height={height}
                    width={width}
                    columnCount={2}
                    columnWidth={width / 2}
                    rowCount={Math.ceil(nodes.length / 2)}
                    rowHeight={200}
                    itemData={{ nodes, handleOnPlayClicked }}
                    onItemsRendered={({ visibleRowStartIndex, visibleRowStopIndex }) => {
                      onItemsRendered({
                        overscanStartIndex: visibleRowStartIndex * 2,
                        overscanStopIndex: (visibleRowStopIndex + 1) * 2 - 1,
                        visibleStartIndex: visibleRowStartIndex * 2,
                        visibleStopIndex: (visibleRowStopIndex + 1) * 2 - 1,
                      })
                    }}
                    ref={grid => {
                      typeof ref === 'function' && ref(grid)
                    }}
                  >
                    {GridCell}
                  </Grid>
                )
              )}
            </InfiniteLoader>
          )}
        </AutoSizer>
      </PullToRefresh>
    </>
  )
}

interface RowProps {
  data: PostType[]
  index: number
  setSize: (index: number, height?: number | undefined) => void // Updated to match setSize definition
  handleOnPlayClicked: (trackId: string) => void
}

const Row = ({ data, index, setSize, handleOnPlayClicked }: RowProps) => {
  const rowRef = useRef<HTMLDivElement>(null)
  const lastHeightRef = useRef<number>(0)
  const hasSetInitialSize = useRef(false)

  useEffect(() => {
    // Debounce height measurements to prevent re-render cascade from iframe loading
    const timeoutId = setTimeout(() => {
      const gapHeight = rowRef?.current?.getBoundingClientRect().height || 0

      // Only update if height changed significantly OR if this is the first measurement
      if (!hasSetInitialSize.current || Math.abs(gapHeight - lastHeightRef.current) > 50) {
        hasSetInitialSize.current = true
        lastHeightRef.current = gapHeight
        setSize(index, gapHeight)
      }
    }, hasSetInitialSize.current ? 500 : 50) // Fast initial, slow subsequent

    return () => clearTimeout(timeoutId)
  }, [setSize, index])

  if (!data[index]) {
    return null
  }

  return (
    <div ref={rowRef}>
      <Post key={data[index].id} post={data[index]} handleOnPlayClicked={handleOnPlayClicked} />
    </div>
  )
}
