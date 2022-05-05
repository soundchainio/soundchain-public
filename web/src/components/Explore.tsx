import { ExploreAll } from 'components/ExploreAll';
import { ExploreTracks } from 'components/ExploreTracks';
import { ExploreUsers } from 'components/ExploreUsers';
import React, { useEffect, useState } from 'react';
import { ExploreTab } from 'types/ExploreTabType';
import { ExplorePageFilterWrapper } from 'components/ExplorePageFilterWrapper';
import { GenreLabel } from 'utils/Genres';
import { SaleTypeLabel } from 'utils/SaleTypeLabel';
import { SelectToApolloQuery, SortListingItem } from 'lib/apollo/sorting';
import { useModalState } from 'contexts/providers/modal';
import { useExploreTracksQuery, useListingItemsQuery } from 'lib/graphql';
import { ListView } from 'components/ListView';
import { GridView } from 'components/GridView';

const buildMarketplaceFilter = (genres: GenreLabel[] | undefined, saleType: SaleTypeLabel | undefined) => {
  return {
    ...(genres?.length && { genres: genres.map(genre => genre.key) }),
    ...(saleType && { listingItem: { saleType: saleType.key } }),
  };
};

export const Explore = () => {
  const [selectedTab, setSelectedTab] = useState<ExploreTab>(ExploreTab.ALL);

  const [isGrid, setIsGrid] = useState(true);
  const [genres, setGenres] = useState<GenreLabel[] | undefined>(undefined);
  const [saleType, setSaleType] = useState<SaleTypeLabel | undefined>(undefined);
  const [sorting, setSorting] = useState<SortListingItem>(SortListingItem.CreatedAt);

  const pageSize = 15;
  const { genres: genresFromModal, filterSaleType } = useModalState();

  const { data, refetch, fetchMore, loading } = useExploreTracksQuery({
    variables: {
      page: { first: pageSize },
      sort: SelectToApolloQuery[sorting],
      filter: {},
    },
    ssr: false,
  });

  useEffect(() => genresFromModal && setGenres(genresFromModal), [genresFromModal]);
  useEffect(() => filterSaleType && setSaleType(filterSaleType), [filterSaleType]);

  useEffect(() => {
    refetch({
      page: {
        first: pageSize,
      },
      sort: SelectToApolloQuery[sorting],
      filter: buildMarketplaceFilter(genres, saleType),
    });
  }, [genres, saleType, refetch, sorting]);

  const loadMore = () => {
    fetchMore({
      variables: {
        page: {
          first: pageSize,
          after: data?.listingItems.pageInfo.endCursor,
        },
        sort: SelectToApolloQuery[sorting],
        filter: buildMarketplaceFilter(genres, saleType),
      },
    });
  };

  return (
    <div className="bg-black h-full overflow-hidden">
      <ExplorePageFilterWrapper
        totalCount={data?.listingItems.pageInfo.totalCount}
        isGrid={isGrid}
        setIsGrid={setIsGrid}
        genres={genres}
        setGenres={setGenres}
        saleType={saleType}
        setSaleType={setSaleType}
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
          hasNextPage={data?.listingItems.pageInfo.hasNextPage}
          loadMore={loadMore}
          tracks={data?.listingItems.nodes}
          refetch={refetch}
        />
      ) : (
        <ListView
          loading={loading}
          hasNextPage={data?.listingItems.pageInfo.hasNextPage}
          loadMore={loadMore}
          tracks={data?.listingItems.nodes}
          refetch={refetch}
        />
      )}
    </div>
  );
};
