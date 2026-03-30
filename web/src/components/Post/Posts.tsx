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
import { PostSkeleton } from './PostSkeleton'
import { LayoutGrid, List as ListIcon, X, MessageCircle } from 'lucide-react'
import { Comments } from '../Comment/Comments'
import { NewCommentForm } from '../NewCommentForm'
import { PostFormTimeline } from './PostFormTimeline'

interface PostsProps extends React.ComponentPropsWithoutRef<'div'> {
  profileId?: string
  // When true, uses simple scroll-based loading instead of virtualization
  // Needed when Posts is rendered inside a parent with its own scroll (like profile pages)
  disableVirtualization?: boolean
  // External view mode control - when provided, overrides internal state
  viewMode?: 'grid' | 'list'
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
    <div style={{ ...style, padding: '1px' }}>
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

export const Posts = ({ profileId, disableVirtualization, viewMode: externalViewMode }: PostsProps) => {
  // Auto-disable virtualization for profile pages (they have their own scroll container)
  const useSimpleMode = disableVirtualization || !!profileId
  // Use external viewMode if provided, otherwise use internal state
  const [internalViewMode, setInternalViewMode] = useState<ViewMode>('list')
  const viewMode = externalViewMode || internalViewMode
  const setViewMode = setInternalViewMode
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
  // Debug logging removed — was spamming console on every state change

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const listRef = useRef<any>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const gridRef = useRef<any>(null)
  // Ref for infinite scroll trigger in simple mode - MUST be before conditional returns
  const loadMoreRef = useRef<HTMLDivElement>(null)
  // Track scroll position to preserve when switching views
  const scrollPositionRef = useRef<{ list: number; grid: number }>({ list: 0, grid: 0 })
  // Default height lowered to 400 — closer to actual post size, prevents massive jumps
  // Video posts will resize up via ResizeObserver, but initial jump is much smaller
  const getSize = (index: number) => sizeMap[index] || 400
  const sizeMap = useMemo<{ [key: number]: number }>(() => ({}), [])
  // Debounced resetAfterIndex — batch rapid size updates to prevent cascade reflows
  const pendingResetRef = useRef<number | null>(null)
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const setSize = useCallback(
    (index: number, height?: number | undefined) => {
      const size = height || 0
      sizeMap[index] = size + GAP
      // Track lowest changed index for batch reset
      if (pendingResetRef.current === null || index < pendingResetRef.current) {
        pendingResetRef.current = index
      }
      // Debounce: wait 150ms for more size updates before resetting
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current)
      resetTimerRef.current = setTimeout(() => {
        if (pendingResetRef.current !== null && listRef?.current) {
          listRef.current.resetAfterIndex(pendingResetRef.current)
          pendingResetRef.current = null
        }
      }, 150)
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

  // Use ref for nodes to avoid useCallback dependency on Apollo's ever-changing array reference
  // MUST be before any conditional returns (Rules of Hooks)
  const nodesRef = useRef(nodes)
  nodesRef.current = nodes

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

  // Get pageInfo safely for hooks that need it - MUST be before conditional returns
  const pageInfo = data?.posts?.pageInfo

  // Load more callback for infinite scroll - MUST be before conditional returns
  const loadMore = useCallback(() => {
    if (loading || !pageInfo?.endCursor) return
    fetchMore({
      variables: {
        page: {
          first: pageSize,
          after: pageInfo?.endCursor,
        },
      },
    })
  }, [fetchMore, pageInfo?.endCursor, loading])

  // Auto-load more when scrolling near bottom (infinite scroll for simple mode) - MUST be before conditional returns
  useEffect(() => {
    if (!useSimpleMode || !loadMoreRef.current || !pageInfo?.hasNextPage || loading) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && pageInfo?.hasNextPage && !loading) {
          loadMore()
        }
      },
      { threshold: 0.1, rootMargin: '200px' }
    )

    observer.observe(loadMoreRef.current)
    return () => observer.disconnect()
  }, [useSimpleMode, pageInfo?.hasNextPage, loading, loadMore])

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

  if (!data || !data.posts || !data.posts.nodes || data.posts.nodes.length === 0) {
    console.log('📫 Posts: No data available', { data, posts: data?.posts })
    return (
      <div className="flex flex-col items-center gap-4 py-12 px-4">
        <div className="text-4xl">🎵</div>
        <p className="text-neutral-300 text-sm font-medium">Your feed is quiet</p>
        <p className="text-neutral-500 text-xs text-center max-w-xs">Follow artists and creators to see their posts here, or explore what&apos;s trending.</p>
        <a
          href="/dex/explore"
          className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white text-sm rounded-lg transition-colors"
        >
          Explore SoundChain
        </a>
      </div>
    )
  }

  const loadMoreItems = loading ? () => null : loadMore
  const isItemLoaded = (index: number) => !pageInfo?.hasNextPage || index < nodes!.length
  const postsCount = pageInfo?.hasNextPage ? nodes!.length + 1 : nodes!.length

  const handleOnPlayClicked = useCallback((trackId: string) => {
    const currentNodes = nodesRef.current
    if (currentNodes) {
      // Find the post that contains this track and set it as active
      const playingPost = (currentNodes as PostType[]).find(post => post.track?.id === trackId)
      if (playingPost) {
        setActivePostId(playingPost.id)
      }

      const listOfTracks = (currentNodes as PostType[])
        .filter(post => post.track && post.track.deleted === false)
        .map(post => {
          if (post.track) {
            return {
              src: post.track.playbackUrl || post.track.assetUrl || '',
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
  }, [playlistState])

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
        <div className="space-y-2 md:space-y-4 min-h-screen">
          {/* Write on feed — compose box */}
          <div className="flex justify-center px-0 md:px-4">
            <div className="w-full max-w-full md:max-w-[614px]">
              <PostFormTimeline />
            </div>
          </div>

          {(simpleNodes as PostType[]).map((post) => (
            <div key={post.id} className="flex justify-center px-0 md:px-4">
              <div className="w-full max-w-full md:max-w-[614px]">
                <Post post={post} handleOnPlayClicked={handleOnPlayClicked} />
              </div>
            </div>
          ))}

          {/* Auto-load trigger + fallback button */}
          <div ref={loadMoreRef} className="flex justify-center py-8">
            {pageInfo?.hasNextPage && (
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
            )}
          </div>

          {/* End of feed indicator */}
          {!pageInfo?.hasNextPage && simpleNodes.length > 0 && (
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
      {/* Write on feed — compose box */}
      <div className="flex justify-center px-0 md:px-4 mb-2">
        <div className="w-full max-w-full md:max-w-[614px]">
          <PostFormTimeline />
        </div>
      </div>

      <PullToRefresh onRefresh={refetch} className="bg-black" backgroundColor="#000000">
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
                        <div style={{ ...style, backgroundColor: '#000' }}>
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

  // Measure and update height
  const measureHeight = useCallback(() => {
    if (!rowRef.current) return
    const height = rowRef.current.getBoundingClientRect().height
    // Only update if height changed by more than 10px to prevent jitter
    if (height > 0 && Math.abs(height - lastHeightRef.current) > 10) {
      lastHeightRef.current = height
      setSize(index, height)
    }
  }, [setSize, index])

  useEffect(() => {
    // Single initial measurement after paint
    const initialTimeout = setTimeout(measureHeight, 80)

    // ResizeObserver for dynamic content (media load, embed resize)
    // Debounced internally via the setSize callback in parent
    let resizeObserver: ResizeObserver | null = null
    if (rowRef.current && typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => {
        measureHeight()
      })
      resizeObserver.observe(rowRef.current)
    }

    return () => {
      clearTimeout(initialTimeout)
      resizeObserver?.disconnect()
    }
  }, [measureHeight])

  if (!data[index]) {
    return null
  }

  return (
    <div ref={rowRef} className="flex justify-center px-0 md:px-4 pb-2 md:pb-0">
      <div className="w-full max-w-full md:max-w-[614px]">
        <Post key={data[index].id} post={data[index]} handleOnPlayClicked={handleOnPlayClicked} />
      </div>
    </div>
  )
}
