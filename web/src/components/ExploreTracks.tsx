import { ExploreTracksQuery, PageInput, TrackQuery, useExploreTracksQuery } from 'lib/graphql'
import React, { memo, useState } from 'react'
import { areEqual, FixedSizeList as List, ListChildComponentProps } from 'react-window'
import AutoSizer from 'react-virtualized-auto-sizer'
import InfiniteLoader from 'react-window-infinite-loader'
import { NoResultFound } from './NoResultFound'
import { TrackListItemSkeleton } from './TrackListItemSkeleton'
import { LoaderAnimation } from 'components/LoaderAnimation'
import { Track } from './Track'
import { ExploreSearchBar } from './pages/ExplorePage/ExploreSearchBar'

const pageSize = 30

export const ExploreTracks = () => {
  const firstPage: PageInput = { first: pageSize }

  const [searchTerm, setSearchTerm] = useState('')

  const { data, loading, fetchMore } = useExploreTracksQuery({
    variables: { search: searchTerm, page: firstPage },
  })

  if (loading) {
    return (
      <>
        <TrackListItemSkeleton />
        <TrackListItemSkeleton />
        <TrackListItemSkeleton />
      </>
    )
  }

  if (!data) {
    return <NoResultFound type="tracks" />
  }

  const { nodes: tracks, pageInfo } = data?.exploreTracks

  const loadMore = () => {
    fetchMore({
      variables: {
        search: searchTerm,
        page: {
          first: pageSize,
          after: pageInfo.endCursor,
          inclusive: false,
        },
      },
    })
  }

  const loadMoreItems = loading ? () => null : loadMore
  const isItemLoaded = (index: number) => !pageInfo.hasNextPage || index < tracks.length
  const tracksCount = pageInfo.hasNextPage ? tracks.length + 1 : tracks.length

  return (
    <div className="h-[calc(100%-106px)] bg-gray-10">
      <ExploreSearchBar searchTerm={searchTerm} setSearchTerm={setSearchTerm} />
      {tracks.length ? (
        <AutoSizer>
          {({ height, width }) => (
            <InfiniteLoader isItemLoaded={isItemLoaded} itemCount={tracksCount} loadMoreItems={loadMoreItems}>
              {({ onItemsRendered, ref }) => (
                <List
                  height={height}
                  width={width}
                  onItemsRendered={onItemsRendered}
                  ref={ref}
                  itemCount={tracksCount}
                  itemSize={130}
                  itemData={tracks}
                >
                  {props => <Data currentResult={data.exploreTracks} {...props} />}
                </List>
              )}
            </InfiniteLoader>
          )}
        </AutoSizer>
      ) : (
        <NoResultFound type="Tracks" />
      )}
    </div>
  )
}

interface DataProps extends ListChildComponentProps<ExploreTracksQuery['exploreTracks']['nodes']> {
  currentResult: ExploreTracksQuery['exploreTracks']
}

const Data = memo(function Data({ data, index, style, currentResult }: DataProps) {
  const { nodes: tracks, pageInfo } = currentResult
  const isItemLoaded = (index: number) => !pageInfo.hasNextPage || index < tracks.length

  return (
    <div style={style}>
      {!isItemLoaded(index) ? (
        <LoaderAnimation loadingMessage="Loading..." />
      ) : (
        <Track key={data[index].id} track={data[index] as TrackQuery['track']} hideBadgeAndPrice />
      )}
    </div>
  )
}, areEqual)
