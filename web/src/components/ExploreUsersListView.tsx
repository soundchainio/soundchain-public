/* eslint-disable react/display-name */
import { ProfileListItem } from 'components/ProfileListItem'
import { PageInput, useExploreUsersQuery } from 'lib/graphql'
import { memo } from 'react'
import AutoSizer from 'react-virtualized-auto-sizer'
import { areEqual, FixedSizeList as List } from 'react-window'
import InfiniteLoader from 'react-window-infinite-loader'
import { LoaderAnimation } from 'components/LoaderAnimation'
import { NoResultFound } from './NoResultFound'
import { ProfileListItemSkeleton } from './ProfileListItemSkeleton'

const pageSize = 30

export interface ExploreUsersProps {
  searchTerm: string
}

export const ExploreUsersListView = ({ searchTerm }: ExploreUsersProps) => {
  const firstPage: PageInput = { first: pageSize }

  const { data, loading, fetchMore } = useExploreUsersQuery({
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
  const isItemLoaded = (index: number) => !pageInfo.hasNextPage || index < profiles.length
  const usersCount = pageInfo.hasNextPage ? profiles.length + 1 : profiles.length

  return (
    <div className="h-[calc(100%-96px)] bg-gray-10 px-1 md:p-4">
      {profiles.length ? (
        <AutoSizer>
          {({ height, width }) => (
            <InfiniteLoader isItemLoaded={isItemLoaded} itemCount={usersCount} loadMoreItems={loadMoreItems}>
              {({ onItemsRendered, ref }) => (
                <List
                  height={height}
                  width={width}
                  onItemsRendered={onItemsRendered}
                  ref={ref}
                  className="mx-auto"
                  itemCount={usersCount}
                  itemSize={115}
                  itemData={profiles}
                >
                  {memo(
                    ({ data, index, style }) => (
                      <div style={style}>
                        {!isItemLoaded(index) ? (
                          <LoaderAnimation loadingMessage="Loading..." />
                        ) : (
                          <ProfileListItem key={data[index].id} profile={data[index]} />
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
      ) : (
        <NoResultFound type="Users" />
      )}
    </div>
  )
}
