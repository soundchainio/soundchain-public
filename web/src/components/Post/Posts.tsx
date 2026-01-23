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
  // When true, uses simple scroll-based loading instead of virtualization
  // Needed when Posts is rendered inside a parent with its own scroll (like profile pages)
  disableVirtualization?: boolean
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

export const Posts = ({ profileId, disableVirtualization }: PostsProps) => {
  // Auto-disable virtualization for profile pages (they have their own scroll container)
  const useSimpleMode = disableVirtualization || !!profileId
  const [viewMode, setViewMode] = useState<ViewMode>('list') // Default to list view for better content visibility
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null)
  const [activePostId, setActivePostId] = useState<string | null>(null) // Track last interacted/playing post
  const { playlistState, currentSong, isPlaying } = useAudioPlayerContext()
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
    setActivePostId(postId) // Track this as active post
  }, [])

  // Find index of a post by ID
  const findPostIndex = useCallback((postId: string | null, posts: PostType[]) => {
    if (!postId || !posts) return -1
    return posts.findIndex(p => p.id === postId)
  }, [])

  // Scroll to a specific post index in current view
  const scrollToPostIndex = useCallback((index: number, columnCount: number = 1) => {
    if (index < 0) return

    if (viewMode === 'list' && listRef.current) {
      listRef.current.scrollToItem(index, 'center')
    } else if (viewMode === 'grid' && gridRef.current) {
      const rowIndex = Math.floor(index / columnCount)
      gridRef.current.scrollToItem({ rowIndex, columnIndex: 0, align: 'center' })
    }
  }, [viewMode])

  // Get nodes for hooks that need them (safe even if data not loaded yet)
  const nodes = data?.posts?.nodes

  // Find the currently playing post (for jump-to feature) - MUST be before conditional returns
  const playingPostId = useMemo(() => {
    if (!isPlaying || !currentSong?.trackId || !nodes) return null
    const post = (nodes as PostType[]).find(p => p.track?.id === currentSong.trackId)
    return post?.id || null
  }, [isPlaying, currentSong?.trackId, nodes])

  // Jump to the currently playing or active post - MUST be before conditional returns
  const jumpToActivePost = useCallback((columnCount: number = 1) => {
    const targetId = playingPostId || activePostId
    if (!targetId || !nodes) return
    const index = findPostIndex(targetId, nodes as PostType[])
    if (index >= 0) {
      scrollToPostIndex(index, columnCount)
    }
  }, [playingPostId, activePostId, nodes, findPostIndex, scrollToPostIndex])

  if (loading) {
    return (
      <div className="space-y-2">
        <PostSkeleton />
        <PostSkeleton />
        <PostSkeleton />
      </div>
    )
  }

  // Show error state if query failed
  if (error && !data) {
    console.error('📫 Posts query error:', error)
    return (
      <div className="p-8 text-center">
        <p className="text-red-400 mb-2">Failed to load feed</p>
        <p className="text-neutral-500 text-sm mb-4">{error.message}</p>
        <button
          onClick={() => refetch()}
          className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg"
        >
          Try again
        </button>
      </div>
    )
  }

  if (!data || !data.posts || !data.posts.nodes) {
    console.log('📫 Posts: No data available', { data, posts: data?.posts })
    return <NoResultFound type="posts" />
  }

  const { pageInfo } = data.posts

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
  const isItemLoaded = (index: number) => !pageInfo.hasNextPage || index < nodes!.length
  const postsCount = pageInfo.hasNextPage ? nodes!.length + 1 : nodes!.length

  const handleOnPlayClicked = (trackId: string) => {
    if (nodes) {
      // Find the post that contains this track and set it as active
      const playingPost = (nodes as PostType[]).find(post => post.track?.id === trackId)
      if (playingPost) {
        setActivePostId(playingPost.id)
      }

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

  // Simple mode rendering for profile pages (no virtualization)
  // This avoids AutoSizer issues when Posts is inside a parent with its own scroll
  if (useSimpleMode) {
    const simpleNodes = nodes || []

    return (
      <>
        {/* Simple mapped posts - no virtualization, stacked on mobile */}
        <div className="md:space-y-4">
          {(simpleNodes as PostType[]).map((post, index) => (
            <div key={post.id} className="flex justify-center px-0 md:px-4">
              <div className="w-full max-w-full md:max-w-[614px]">
                {/* Thin separator between posts on mobile */}
                {index > 0 && <div className="h-px bg-neutral-800 md:hidden" />}
                <Post post={post} handleOnPlayClicked={handleOnPlayClicked} />
              </div>
            </div>
          ))}

          {/* Load more button */}
          {pageInfo.hasNextPage && (
            <div className="flex justify-center py-8">
              <button
                onClick={loadMore}
                disabled={loading}
                className="px-6 py-2 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 rounded-lg border border-cyan-500/30 transition-colors disabled:opacity-50"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <div className="animate-spin w-4 h-4 border-2 border-cyan-500 border-t-transparent rounded-full" />
                    Loading...
                  </span>
                ) : (
                  'Load more'
                )}
              </button>
            </div>
          )}

          {/* End of feed indicator */}
          {!pageInfo.hasNextPage && simpleNodes.length > 0 && (
            <div className="text-center py-8 text-neutral-500 text-sm">
              You've reached the end
            </div>
          )}

          {/* Empty state */}
          {!loading && simpleNodes.length === 0 && (
            <div className="text-center py-12 text-neutral-500">
              <p>No posts yet</p>
            </div>
          )}
        </div>

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

  return (
    <>
      {/* Post Form - Centered like Instagram */}
      <div className="flex justify-center px-4 mb-4">
        <div className="w-full max-w-[614px]">
          <PostFormTimeline />
        </div>
      </div>

      {/* View Mode Toggle & Now Playing Tracker */}
      <div className="flex justify-center px-4 mb-3">
        <div className="w-full max-w-[614px] flex justify-between items-center">
        {/* Now Playing Jump Button - Only shows when a track is playing */}
        <div className="flex-1">
          {(playingPostId || activePostId) && (
            <button
              onClick={() => jumpToActivePost(getColumnCount(window.innerWidth))}
              className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-cyan-500/20 to-purple-500/20 border border-cyan-500/30 rounded-full text-xs text-cyan-400 hover:border-cyan-400/50 transition-all"
              title="Jump to now playing"
            >
              {isPlaying ? (
                <>
                  <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                  <span>Now Playing</span>
                </>
              ) : activePostId ? (
                <>
                  <span className="w-2 h-2 bg-cyan-400 rounded-full" />
                  <span>Last Played</span>
                </>
              ) : null}
            </button>
          )}
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center gap-1 bg-neutral-800/50 rounded-lg p-1">
          <button
            onClick={() => {
              setViewMode('list')
              // Jump to active/playing post after switching to list view
              setTimeout(() => {
                const targetId = playingPostId || activePostId
                if (targetId && nodes) {
                  const index = findPostIndex(targetId, nodes as PostType[])
                  if (index >= 0 && listRef.current) {
                    listRef.current.scrollToItem(index, 'center')
                  }
                }
              }, 100)
            }}
            className={`p-2 rounded-md transition-colors ${viewMode === 'list' ? 'bg-cyan-500/20 text-cyan-400' : 'text-gray-400 hover:text-white'}`}
            title="List view"
          >
            <ListIcon className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              setViewMode('grid')
              // Jump to active/playing post after switching to grid view
              setTimeout(() => {
                const targetId = playingPostId || activePostId
                if (targetId && nodes) {
                  const index = findPostIndex(targetId, nodes as PostType[])
                  if (index >= 0 && gridRef.current) {
                    const columnCount = getColumnCount(window.innerWidth)
                    const rowIndex = Math.floor(index / columnCount)
                    gridRef.current.scrollToItem({ rowIndex, columnIndex: 0, align: 'center' })
                  }
                }
              }, 100)
            }}
            className={`p-2 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-cyan-500/20 text-cyan-400' : 'text-gray-400 hover:text-white'}`}
            title="Grid view (compact)"
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
        </div>
        </div>
      </div>

      <PullToRefresh onRefresh={refetch}>
        <AutoSizer>
          {({ height, width }) => (
            <InfiniteLoader isItemLoaded={isItemLoaded} itemCount={postsCount} loadMoreItems={loadMoreItems} threshold={5}>
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
                        rowCount={Math.ceil(nodes!.length / columnCount)}
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
    <div ref={rowRef} className="flex justify-center px-0 md:px-4">
      <div className="w-full max-w-full md:max-w-[614px]">
        {/* Thin separator between posts on mobile */}
        {index > 0 && <div className="h-px bg-neutral-800 md:hidden" />}
        <Post key={data[index].id} post={data[index]} handleOnPlayClicked={handleOnPlayClicked} />
      </div>
    </div>
  )
}
