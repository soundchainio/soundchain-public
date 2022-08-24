/* eslint-disable react/display-name */
import { useModalState } from 'contexts/providers/modal';
import { SelectToApolloQuery, SortListingItem } from 'lib/apollo/sorting';
import { Track, useListingItemsQuery } from 'lib/graphql';
import React, { useEffect, useState } from 'react';
import { GenreLabel } from 'utils/Genres';
import { SaleTypeLabel } from 'utils/SaleTypeLabel';
import { MarketplaceFilterWrapper } from './MarketplaceFilterWrapper';
import { ListView } from 'components/ListView';
import { GridView } from 'components/GridView';

const buildMarketplaceFilter = (genres: GenreLabel[] | undefined, saleType: SaleTypeLabel | undefined) => {
  return {
    ...(genres?.length && { genres: genres.map(genre => genre.key) }),
    ...(saleType && { listingItem: { saleType: saleType.key } }),
  };
};

export const Marketplace = () => {
  const pageSize = 15;
  const { genres: genresFromModal, filterSaleType } = useModalState();
  const [isGrid, setIsGrid] = useState(true);
  const [genres, setGenres] = useState<GenreLabel[] | undefined>(undefined);
  const [saleType, setSaleType] = useState<SaleTypeLabel | undefined>(undefined);
  const [sorting, setSorting] = useState<SortListingItem>(SortListingItem.CreatedAt);

  const { data, refetch, fetchMore, loading } = useListingItemsQuery({
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
    <>
      <MarketplaceFilterWrapper
        totalCount={data?.listingItems.pageInfo.totalCount}
        isGrid={isGrid}
        setIsGrid={setIsGrid}
        genres={genres}
        setGenres={setGenres}
        saleType={saleType}
        setSaleType={setSaleType}
        sorting={sorting}
        setSorting={setSorting}
      />
      {isGrid ? (
        <GridView
          loading={loading}
          hasNextPage={data?.listingItems.pageInfo.hasNextPage}
          loadMore={loadMore}
          tracks={data?.listingItems.nodes as Track[]}
          refetch={refetch}
        />
      ) : (
        <ListView
          loading={loading}
          hasNextPage={data?.listingItems.pageInfo.hasNextPage}
          loadMore={loadMore}
          tracks={data?.listingItems.nodes as Track[]}
          refetch={refetch}
        />
      )}
    </>
  );
};
