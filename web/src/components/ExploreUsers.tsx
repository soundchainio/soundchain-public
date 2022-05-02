/* eslint-disable react/display-name */
import { ProfileListItem } from 'components/ProfileListItem';
import { PageInput, useExploreUsersQuery } from 'lib/graphql';
import React, { memo, useState } from 'react';
import { FixedSizeList as List, areEqual } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import InfiniteLoader from 'react-window-infinite-loader';
import { NoResultFound } from './NoResultFound';
import { ProfileListItemSkeleton } from './ProfileListItemSkeleton';
import { LoaderAnimation } from './LoaderAnimation';
import { ExploreSearchBar } from './ExploreSearchBar';

const pageSize = 15;

export const ExploreUsers = () => {
  const firstPage: PageInput = { first: pageSize };
  
  const [searchTerm, setSearchTerm] = useState('');

  const { data, loading, fetchMore } = useExploreUsersQuery({
    variables: { search: searchTerm, page: firstPage },
  });

  if (!data || loading)
    return (
      <>
        <ProfileListItemSkeleton />
        <ProfileListItemSkeleton />
        <ProfileListItemSkeleton />
      </>
    );

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
    });
  };

  const { nodes: profiles, pageInfo } = data?.exploreUsers;

  const loadMoreItems = loading ? () => null : loadMore;
  const isItemLoaded = (index: number) => !pageInfo.hasNextPage || index < profiles.length;
  const usersCount = pageInfo.hasNextPage ? profiles.length + 1 : profiles.length;

  return (
    <div className="bg-gray-10 p-4 h-[calc(100%-96px)]">
      <ExploreSearchBar setSearchTerm={setSearchTerm} />
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
                  itemCount={usersCount}
                  itemSize={64}
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
  );
};