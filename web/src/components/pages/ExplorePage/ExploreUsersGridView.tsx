/* eslint-disable react/display-name */
import { PageInput, useExploreUsersQuery } from 'lib/graphql'
import React from 'react'
import { NoResultFound } from '../../NoResultFound'
import { ProfileListItemSkeleton } from '../../ProfileListItemSkeleton'
import { ExploreUsersProps } from '../../ExploreUsersListView'
import { ProfileGridItem } from '../../ProfileGridItem'
import { GridSkeleton } from '../../GridSkeleton'
import PullToRefresh from 'react-simple-pull-to-refresh'
import { InfiniteLoader as InfiniteLoaderLegacy } from '../../InfiniteLoader'

const pageSize = 30

export const ExploreUsersGridView = ({ searchTerm }: ExploreUsersProps) => {
  const firstPage: PageInput = { first: pageSize }

  const { data, loading, fetchMore, refetch } = useExploreUsersQuery({
    variables: { search: searchTerm, page: firstPage },
  })

  if (!data || loading)
    return (
      <>
        <ProfileListItemSkeleton />
        <ProfileListItemSkeleton />
        <ProfileListItemSkeleton />
      </>
    )

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

  const { nodes: profiles, pageInfo } = data?.exploreUsers

  const loadMoreItems = loading ? () => null : loadMore

  return (
    <div className="h-[calc(100%-96px)] bg-gray-10 px-1 md:p-4">
      {loading ? (
        <div className="grid grid-cols-2 justify-center gap-2 p-4 sm:grid-cols-3 lg:grid-cols-4">
          <GridSkeleton />
          <GridSkeleton />
          <GridSkeleton />
          <GridSkeleton />
        </div>
      ) : !profiles ? (
        <NoResultFound type="items" />
      ) : (
        <PullToRefresh onRefresh={refetch} className="h-auto">
          <div className="user-profile-grid">
            {profiles.map(profile => (
              <ProfileGridItem key={profile.id} profile={profile} />
            ))}
          </div>
        </PullToRefresh>
      )}
      <div className="flex justify-center">
        {pageInfo.hasNextPage && <InfiniteLoaderLegacy loadMore={loadMoreItems} loadingMessage="Loading Users" />}
      </div>
    </div>
  )
}
