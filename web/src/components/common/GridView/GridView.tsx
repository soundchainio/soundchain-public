import React from 'react'
import { NoResultFound } from '../../NoResultFound'
import { GridSkeleton } from '../../GridSkeleton'
import PullToRefresh from 'react-simple-pull-to-refresh'
import { InfiniteLoader as InfiniteLoaderLegacy } from '../../InfiniteLoader'
import { ApolloQueryResult } from '@apollo/client'
import { ExploreTracksQuery, FavoriteTracksQuery, FollowedArtistsQuery, ListingItemsQuery } from 'lib/graphql'
import { GridItem } from './GridItem/GridItem'

interface Props<T> {
  isLoading?: boolean
  handleOnPlayClicked?: (index: number) => void
  loadMore: () => void
  refetch: () => Promise<
    ApolloQueryResult<ListingItemsQuery | ExploreTracksQuery | FavoriteTracksQuery | FollowedArtistsQuery>
  >
  hasNextPage?: boolean
  list: T[]
  variant: 'track' | 'profile'
}

export const GridView = <T extends unknown>(props: Props<T>) => {
  const { isLoading, list, loadMore, refetch, variant, hasNextPage, handleOnPlayClicked } = props

  return (
    <div className="bg-gray-10 px-1 md:p-4">
      {isLoading ? (
        <div className="grid grid-cols-2 justify-center gap-2 p-4 sm:grid-cols-3 lg:grid-cols-4">
          <GridSkeleton />
          <GridSkeleton />
          <GridSkeleton />
          <GridSkeleton />
        </div>
      ) : !list ? (
        <NoResultFound type="items" />
      ) : (
        <PullToRefresh onRefresh={refetch} className="h-auto">
          <div className="user-profile-grid">
            {list.map((item, index) => (
              <GridItem
                key={index}
                variant={variant}
                item={item}
                handleOnPlayClicked={handleOnPlayClicked}
                index={index}
              />
            ))}
          </div>
        </PullToRefresh>
      )}
      <div className="flex justify-center">
        {hasNextPage && <InfiniteLoaderLegacy loadMore={loadMore} loadingMessage="Loading..." />}
      </div>
    </div>
  )
}
