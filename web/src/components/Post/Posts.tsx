/* eslint-disable react/display-name */
import { LoaderAnimation } from 'components/LoaderAnimation'
import { NoResultFound } from 'components/NoResultFound'
import { Post } from './Post'
import { CompactPost } from './CompactPost'
import { Song, useAudioPlayerContext } from 'hooks/useAudioPlayer'
import { Post as PostType, usePostsQuery, usePostQuery, SortOrder, SortPostField } from 'lib/graphql'
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import PullToRefresh from 'react-simple-pull-to-refresh'
import AutoSizer from 'react-virtualized-auto-sizer'
import { areEqual, VariableSizeList as List, FixedSizeGrid as Grid } from 'react-window'
import InfiniteLoader from 'react-window-infinite-loader'
import { PostFormTimeline } from './PostFormTimeline'
import { PostSkeleton } from './PostSkeleton'
import { LayoutGrid, List as ListIcon, X, MessageCircle } from 'lucide-react'
import { Comments } from '../Comment/Comments'
import { NewCommentForm } from '../NewCommentForm'

interface PostsProps extends React.ComponentPropsWithoutRef<'div'> {
  profileId?: string
}

const pageSize = 30
const GAP = 8

type ViewMode = 'list' | 'grid'

// Grid cell renderer - MUST be outside component to avoid recreation
const GridCell = memo(({ columnIndex, rowIndex, style, data }: any) => {
  const columnCount = data.columnCount || 2
  const itemIndex = rowIndex * columnCount + columnIndex
  const posts = data.nodes
  if (itemIndex >= posts.length) return null

  const post = posts[itemIndex]
  if (!post) return null

  return (
    <div style={{ ...style, padding: '4px' }}>
      <CompactPost
        post={post}
        handleOnPlayClicked={data.handleOnPlayClicked}
        onPostClick={data.onPostClick}
      />
    </div>
  )
})
GridCell.displayName = 'GridCell'

// Post Detail Modal Component
const PostDetailModal = ({ postId, onClose, handleOnPlayClicked }: { postId: string; onClose: () => void; handleOnPlayClicked: (trackId: string) => void }) => {
  const { data, loading } = usePostQuery({
    variables: { id: postId },
    skip: !postId,
  })

  if (!postId) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop with blur */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal content */}
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-neutral-900 rounded-2xl border border-cyan-500/20 shadow-2xl shadow-cyan-500/10">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-neutral-800/80 backdrop-blur flex items-center justify-center hover:bg-neutral-700 transition-colors"
        >
          <X className="w-4 h-4 text-white" />
        </button>

        {loading ? (
          <div className="p-8">
            <PostSkeleton />
          </div>
        ) : data?.post ? (
          <div>
            {/* Full Post View */}
            <Post post={data.post} handleOnPlayClicked={handleOnPlayClicked} />

            {/* Comments Section */}
            <div className="p-4 border-t border-neutral-800">
              <div className="flex items-center gap-2 mb-4">
                <MessageCircle className="w-5 h-5 text-cyan-400" />
                <h3 className="text-white font-semibold">Comments</h3>
                <span className="text-neutral-500 text-sm">({data.post.commentCount || 0})</span>
              </div>
              {/* New Comment Form with emoji/sticker support */}
              <NewCommentForm postId={postId} />
              {/* Existing Comments */}
              <Comments postId={postId} />
            </div>
          </div>
        ) : (
          <div className="p-8 text-center text-neutral-400">
            Post not found
          </div>
        )}
      </div>
    </div>
  )
}

export const Posts = ({ profileId }: PostsProps) => {
  const [viewMode, setViewMode] = useState<ViewMode>('grid') // Default to compact grid view
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null)
  const { playlistState } = useAudioPlayerContext()
  const { data, loading, error, refetch, fetchMore } = usePostsQuery({
    variables: {
      filter: profileId ? { profileId } : undefined,
      page: { first: pageSize },
      sort: { field: SortPostField.CreatedAt, order: SortOrder.Desc },
    },
    ssr: false,
    errorPolicy: 'all', // Return partial data even if some fields have errors
  })
  // Debug: Log query state
  useEffect(() => {
    console.log('📫 Posts Query State:', {
      loading,
      error: error?.message,
      hasData: !!data,
      nodeCount: data?.posts?.nodes?.length,
      nodes: data?.posts?.nodes?.slice(0, 3), // First 3 for debugging
    })
  }, [loading, error, data])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const listRef = useRef<any>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const gridRef = useRef<any>(null)
  // Track scroll position to preserve when switching views
  const scrollPositionRef = useRef<{ list: number; grid: number }>({ list: 0, grid: 0 })
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

  // Handle post click to open modal - MUST be before any conditional returns
  const handlePostClick = useCallback((postId: string) => {
    setSelectedPostId(postId)
  }, [])

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

  // Calculate responsive column count based on width
  // iPhone: 2 cols (~187px each), Desktop: 3-4 cols (~150px each) for tight stacking
  const getColumnCount = (width: number) => {
    if (width < 400) return 2      // Mobile: 2 columns
    if (width < 600) return 3      // Small tablet: 3 columns
    if (width < 900) return 4      // Tablet: 4 columns
    return 5                        // Desktop: 5 columns for tight stacking
  }

  return (
    <>
      {/* Post Form */}
      <PostFormTimeline />

      {/* View Mode Toggle - Below post form, right aligned */}
      <div className="flex justify-end mb-3 px-2">
        <div className="flex items-center gap-1 bg-neutral-800/50 rounded-lg p-1">
          <button
            onClick={() => {
              // Save current grid scroll position before switching
              if (viewMode === 'grid' && gridRef.current) {
                scrollPositionRef.current.grid = gridRef.current.state?.scrollTop || 0
              }
              setViewMode('list')
              // Restore list scroll position after render
              setTimeout(() => {
                if (listRef.current && scrollPositionRef.current.list > 0) {
                  listRef.current.scrollTo(scrollPositionRef.current.list)
                }
              }, 50)
            }}
            className={`p-2 rounded-md transition-colors ${viewMode === 'list' ? 'bg-cyan-500/20 text-cyan-400' : 'text-gray-400 hover:text-white'}`}
            title="List view"
          >
            <ListIcon className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              // Save current list scroll position before switching
              if (viewMode === 'list' && listRef.current) {
                scrollPositionRef.current.list = listRef.current.state?.scrollOffset || 0
              }
              setViewMode('grid')
              // Restore grid scroll position after render
              setTimeout(() => {
                if (gridRef.current && scrollPositionRef.current.grid > 0) {
                  gridRef.current.scrollTo({ scrollTop: scrollPositionRef.current.grid })
                }
              }, 50)
            }}
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
                  // Grid view - responsive columns, tight stacking like iPhone
                  (() => {
                    const columnCount = getColumnCount(width)
                    const columnWidth = width / columnCount
                    // Row height for premium cards (square aspect + footer ~60px for new design)
                    const rowHeight = columnWidth + 60
                    return (
                      <Grid
                        height={height}
                        width={width}
                        columnCount={columnCount}
                        columnWidth={columnWidth}
                        rowCount={Math.ceil(nodes.length / columnCount)}
                        rowHeight={rowHeight}
                        itemData={{ nodes, handleOnPlayClicked, columnCount, onPostClick: handlePostClick }}
                        onItemsRendered={({ visibleRowStartIndex, visibleRowStopIndex }) => {
                          onItemsRendered({
                            overscanStartIndex: visibleRowStartIndex * columnCount,
                            overscanStopIndex: (visibleRowStopIndex + 1) * columnCount - 1,
                            visibleStartIndex: visibleRowStartIndex * columnCount,
                            visibleStopIndex: (visibleRowStopIndex + 1) * columnCount - 1,
                          })
                        }}
                        ref={grid => {
                          typeof ref === 'function' && ref(grid)
                          gridRef.current = grid
                        }}
                      >
                        {GridCell}
                      </Grid>
                    )
                  })()
                )
              )}
            </InfiniteLoader>
          )}
        </AutoSizer>
      </PullToRefresh>

      {/* Post Detail Modal */}
      {selectedPostId && (
        <PostDetailModal
          postId={selectedPostId}
          onClose={() => setSelectedPostId(null)}
          handleOnPlayClicked={handleOnPlayClicked}
        />
      )}
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
