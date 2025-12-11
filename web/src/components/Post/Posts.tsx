/* eslint-disable react/display-name */
import { LoaderAnimation } from 'components/LoaderAnimation'
import { NoResultFound } from 'components/NoResultFound'
import { Post } from './Post'
import { Song, useAudioPlayerContext } from 'hooks/useAudioPlayer'
import { Post as PostType, usePostsQuery, SortOrder, SortPostField } from 'lib/graphql'
import React, { memo, useCallback, useEffect, useMemo, useRef } from 'react'
import PullToRefresh from 'react-simple-pull-to-refresh'
import AutoSizer from 'react-virtualized-auto-sizer'
import { areEqual, VariableSizeList as List } from 'react-window'
import InfiniteLoader from 'react-window-infinite-loader'
import { PostFormTimeline } from './PostFormTimeline'
import { PostSkeleton } from './PostSkeleton'

interface PostsProps extends React.ComponentPropsWithoutRef<'div'> {
  profileId?: string
}

const pageSize = 30
const GAP = 8

export const Posts = ({ profileId }: PostsProps) => {
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

  return (
    <>
      <PostFormTimeline />
      <PullToRefresh onRefresh={refetch}>
        <AutoSizer>
          {({ height, width }) => (
            <InfiniteLoader isItemLoaded={isItemLoaded} itemCount={postsCount} loadMoreItems={loadMoreItems}>
              {({ onItemsRendered, ref }) => (
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

  useEffect(() => {
    const gapHeight = rowRef?.current?.getBoundingClientRect().height || 0

    // Only update if height changed significantly (prevents re-render loop from iframe loading)
    if (Math.abs(gapHeight - lastHeightRef.current) > 5) {
      lastHeightRef.current = gapHeight
      setSize(index, gapHeight)
    }
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
