import { ExploreAll } from 'components/ExploreAll';
import { ExploreUsersListView } from 'components/ExploreUsersListView';
import React, { useEffect, useState } from 'react';
import { ExploreTab } from 'types/ExploreTabType';
import { ExplorePageFilterWrapper } from 'components/ExplorePageFilterWrapper';
import { SelectToApolloQuery, SortListingItem, SortListingParam } from 'lib/apollo/sorting';
import { SortExploreTracksField, Track, useExploreTracksQuery } from 'lib/graphql';
import { ListView } from 'components/ListView';
import { GridView } from 'components/GridView';
import { ExploreSearchBar } from './ExploreSearchBar';
import { ExploreUsersGridView } from './ExploreUsersGridView';

export const Explore = () => {
  const [selectedTab, setSelectedTab] = useState<ExploreTab>(ExploreTab.ALL);
  const [search, setSearch] = useState('');
  const [isGrid, setIsGrid] = useState(true);
  const [sorting, setSorting] = useState<SortListingItem>(SortListingItem.CreatedAt);

  const pageSize = 15;

  const { data, refetch, fetchMore, loading } = useExploreTracksQuery({
    variables: {
      page: { first: pageSize },
      search,
      sort: SelectToApolloQuery[sorting] as unknown as SortListingParam<SortExploreTracksField>,
    },
    ssr: false,
  });

  useEffect(() => {
    refetch({
      search,
      page: {
        first: pageSize,
      },
      sort: SelectToApolloQuery[sorting] as unknown as SortListingParam<SortExploreTracksField>,
    });
  }, [refetch, sorting, search]);

  const loadMore = () => {
    fetchMore({
      variables: {
        search,
        page: {
          first: pageSize,
          after: data?.exploreTracks.pageInfo.endCursor,
        },
        sort: SelectToApolloQuery[sorting],
      },
    });
  };


  return (
    <div className="bg-gray-10 h-full overflow-x-hidden md:px-2">
      <ExplorePageFilterWrapper
        totalCount={data?.exploreTracks.pageInfo.totalCount}
        isGrid={isGrid}
        setIsGrid={setIsGrid}
        sorting={sorting}
        setSorting={setSorting}
        selectedTab={selectedTab}
        setSelectedTab={setSelectedTab}
      />

      {selectedTab === ExploreTab.ALL && <ExploreAll setSelectedTab={setSelectedTab} />}
      {selectedTab === ExploreTab.USERS && (
        <>
          <ExploreSearchBar setSearchTerm={searchTerm => setSearch(searchTerm)} />

          {isGrid ? <ExploreUsersGridView searchTerm={search} /> : <ExploreUsersListView searchTerm={search} />}
        </>
      )}
      {selectedTab === ExploreTab.TRACKS && (
        <>
          <ExploreSearchBar setSearchTerm={searchTerm => setSearch(searchTerm)} />
          {isGrid ? (
            <GridView
              loading={loading}
              hasNextPage={data?.exploreTracks.pageInfo.hasNextPage}
              loadMore={loadMore}
              tracks={data?.exploreTracks.nodes as Track[]}
              refetch={refetch}
            />
          ) : (
            <ListView
              loading={loading}
              hasNextPage={data?.exploreTracks.pageInfo.hasNextPage}
              loadMore={loadMore}
              tracks={data?.exploreTracks.nodes as Track[]}
              displaySaleBadge={true}
              refetch={refetch}
            />
          )}
        </>
      )}
    </div>
  );
};
