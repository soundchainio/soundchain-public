import { ExploreAll } from 'components/ExploreAll';
import { ExploreUsers } from 'components/ExploreUsers';
import React, { useEffect, useState } from 'react';
import { ExploreTab } from 'types/ExploreTabType';
import { ExplorePageFilterWrapper } from 'components/ExplorePageFilterWrapper';
import { SelectToApolloQuery, SortListingItem } from 'lib/apollo/sorting';
import { useExploreTracksQuery } from 'lib/graphql';
import { ListView } from 'components/ListView';
import { GridView } from 'components/GridView';

export const Explore = () => {
  const [selectedTab, setSelectedTab] = useState<ExploreTab>(ExploreTab.ALL);

  const [isGrid, setIsGrid] = useState(true);
  const [sorting, setSorting] = useState<SortListingItem>(SortListingItem.CreatedAt);

  const pageSize = 15;

  const { data, refetch, fetchMore, loading } = useExploreTracksQuery({
    variables: {
      page: { first: pageSize },
      sort: SelectToApolloQuery[sorting],
    },
    ssr: false,
  });

  useEffect(() => {
    refetch({
      page: {
        first: pageSize,
      },
      sort: SelectToApolloQuery[sorting],
    });
  }, [refetch, sorting]);

  const loadMore = () => {
    fetchMore({
      variables: {
        page: {
          first: pageSize,
          after: data?.exploreTracks.pageInfo.endCursor,
        },
        sort: SelectToApolloQuery[sorting],
      },
    });
  };

  return (
    <div className="bg-black h-full overflow-x-hidden md:px-2">
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
      {selectedTab === ExploreTab.USERS && <ExploreUsers />}
      {selectedTab === ExploreTab.TRACKS && isGrid ? (
        <GridView
          loading={loading}
          hasNextPage={data?.exploreTracks.pageInfo.hasNextPage}
          loadMore={loadMore}
          tracks={data?.exploreTracks.nodes}
          refetch={refetch}
        />
      ) : (
        <ListView
          loading={loading}
          hasNextPage={data?.exploreTracks.pageInfo.hasNextPage}
          loadMore={loadMore}
          tracks={data?.exploreTracks.nodes}
          refetch={refetch}
        />
      )}
    </div>
  );
};
