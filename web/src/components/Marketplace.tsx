/* eslint-disable react/display-name */
import { ApolloQueryResult } from '@apollo/client';
import { useModalState } from 'contexts/providers/modal';
import { SelectToApolloQuery, SortListingItem } from 'lib/apollo/sorting';
import { ListingItemsQuery, TrackQuery, TrackWithListingItem, useListingItemsQuery } from 'lib/graphql';
import React, { useEffect, useState } from 'react';
import PullToRefresh from 'react-simple-pull-to-refresh';
import { GenreLabel } from 'utils/Genres';
import { SaleTypeLabel } from 'utils/SaleTypeLabel';
import { GridSkeleton } from './GridSkeleton';
import { InfiniteLoader } from './InfiniteLoader';
import { MarketplaceFilterWrapper } from './MarketplaceFilterWrapper';
import { NoResultFound } from './NoResultFound';
import { PostSkeleton } from './PostSkeleton';
import { Track } from './Track';
import { TrackGrid } from './TrackGrid';

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
  const [sorting, setSorting] = useState<SortListingItem>(SortListingItem.PriceAsc);
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
    </>
  );
};

interface ViewProps {
  loading: boolean;
  loadMore: () => void;
  refetch: () => Promise<ApolloQueryResult<ListingItemsQuery>>;
  hasNextPage?: boolean;
  tracks?: TrackWithListingItem[];
}

const ListView = ({ tracks, loading, refetch, hasNextPage, loadMore }: ViewProps) => {
  return (
    <>
      {loading ? (
        <div className="space-y-2">
          <PostSkeleton />
          <PostSkeleton />
          <PostSkeleton />
        </div>
      ) : !tracks ? (
        <NoResultFound type="items" />
      ) : (
        <PullToRefresh onRefresh={refetch} className="h-auto">
          <div className="space-y-2">
            {tracks.map(track => (
              <Track key={track.id} track={track as TrackQuery['track']} />
            ))}
          </div>
        </PullToRefresh>
      )}
      {hasNextPage && <InfiniteLoader loadMore={loadMore} loadingMessage="Loading Marketplace" />}
    </>
  );
};

const GridView = ({ tracks, loading, refetch, hasNextPage, loadMore }: ViewProps) => {
  return (
    <>
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 p-4 justify-center">
          <GridSkeleton />
          <GridSkeleton />
          <GridSkeleton />
          <GridSkeleton />
        </div>
      ) : !tracks ? (
        <NoResultFound type="items" />
      ) : (
        <PullToRefresh onRefresh={refetch} className="h-auto">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 p-4 justify-center">
            {tracks.map(track => (
              <TrackGrid key={track.id} track={track} />
            ))}
          </div>
        </PullToRefresh>
      )}
      {hasNextPage && <InfiniteLoader loadMore={loadMore} loadingMessage="Loading Marketplace" />}
    </>
  );
};
