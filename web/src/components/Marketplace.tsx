/* eslint-disable react/display-name */
import { ApolloQueryResult } from '@apollo/client';
import { useModalDispatch, useModalState } from 'contexts/providers/modal';
import { Filter } from 'icons/Filter';
import { GridView as GridViewIcon } from 'icons/GridView';
import { ListView as ListViewIcon } from 'icons/ListView';
import {
  ListingItemsQuery,
  SortListingItemField,
  SortOrder,
  TrackQuery,
  TrackWithListingItem,
  useListingItemsQuery,
} from 'lib/graphql';
import React, { Dispatch, memo, SetStateAction, useEffect, useState } from 'react';
import PullToRefresh from 'react-simple-pull-to-refresh';
import { GenreLabel } from 'utils/Genres';
import { SaleTypeLabel } from 'utils/SaleTypeLabel';
import { Badge } from './Badge';
import { GridSkeleton } from './GridSkeleton';
import { InfiniteLoader } from './InfiniteLoader';
import { NoResultFound } from './NoResultFound';
import { PostSkeleton } from './PostSkeleton';
import { Track } from './Track';
import { TrackGrid } from './TrackGrid';

enum SortListingItem {
  PriceAsc = 'PriceAsc',
  PriceDesc = 'PriceDesc',
  PlaybackCount = 'PlaybackCount',
  CreatedAt = 'CreatedAt',
}

const SelectToApolloQuery: Record<SortListingItem, { field: SortListingItemField; order: SortOrder }> = {
  [SortListingItem.PriceAsc]: { field: SortListingItemField.Price, order: SortOrder.Asc },
  [SortListingItem.PriceDesc]: { field: SortListingItemField.Price, order: SortOrder.Desc },
  [SortListingItem.PlaybackCount]: { field: SortListingItemField.PlaybackCount, order: SortOrder.Desc },
  [SortListingItem.CreatedAt]: { field: SortListingItemField.CreatedAt, order: SortOrder.Desc },
};

type FilterWrapperProps = {
  totalCount?: number;
  isGrid?: boolean;
  genres?: GenreLabel[];
  saleType?: SaleTypeLabel;
  sorting: SortListingItem;
  setSorting: Dispatch<SetStateAction<SortListingItem>>;
  setSaleType: Dispatch<SetStateAction<SaleTypeLabel | undefined>>;
  setGenres: Dispatch<SetStateAction<GenreLabel[] | undefined>>;
  setIsGrid: Dispatch<SetStateAction<boolean>>;
};

const buildMarketplaceFilter = (genres: GenreLabel[] | undefined, saleType: SaleTypeLabel | undefined) => {
  return {
    ...(genres?.length && { genres: genres.map(genre => genre.key) }),
    ...(saleType && { listingItem: { saleType: saleType.key } }),
  };
};

const FilterWrapper = memo((props: FilterWrapperProps) => {
  const { genres, saleType, sorting, setSorting, setSaleType, setGenres, isGrid, setIsGrid, totalCount = 0 } = props;
  const { dispatchShowFilterMarketplaceModal } = useModalDispatch();

  return (
    <div>
      <div className="flex gap-2 bg-gray-15 p-4 justify-center items-center">
        <div className="flex-1">
          <span className="text-white text-sm font-bold">{`${totalCount} `} </span>
          <span className="text-gray-80 text-sm">Tracks</span>
        </div>
        <button aria-label="List view">
          <ListViewIcon color={isGrid ? undefined : 'rainbow'} onClick={() => setIsGrid(false)} />
        </button>
        <button aria-label="Grid view">
          <GridViewIcon color={isGrid ? 'rainbow' : undefined} onClick={() => setIsGrid(true)} />
        </button>
      </div>
      <div className="flex gap-2 bg-black p-4 justify-center items-center">
        <div className="flex flex-1 items-center">
          <button
            className="flex items-center justify-center p-2"
            onClick={() => dispatchShowFilterMarketplaceModal(true, genres, saleType)}
          >
            <Filter />
            <span className="text-white text-xs font-bold pl-1">Filter</span>
          </button>
        </div>
        <label htmlFor="sortBy" className="text-gray-80 text-xs font-bold">
          Sort By
        </label>
        <select
          className="bg-gray-25 text-gray-80 font-bold text-xs rounded-lg border-0"
          name="Sort by"
          id="sortBy"
          value={sorting}
          onChange={e => setSorting(e.target.value as SortListingItem)}
        >
          <option value={SortListingItem.PriceAsc}>Least expensive</option>
          <option value={SortListingItem.PriceDesc}>Most expensive</option>
          <option value={SortListingItem.PlaybackCount}>Most listened</option>
          <option value={SortListingItem.CreatedAt}>Newest</option>
        </select>
      </div>
      {(saleType || Boolean(genres?.length)) && (
        <div className="flex flex-wrap p-4 gap-2">
          {saleType && (
            <Badge
              label={saleType.label}
              onDelete={() => {
                dispatchShowFilterMarketplaceModal(false, genres, undefined);
                setSaleType(undefined);
              }}
            />
          )}
          {genres?.map(genre => (
            <Badge
              key={genre.key}
              label={genre.label}
              onDelete={() => {
                const newGenres = genres.filter(it => it !== genre);
                dispatchShowFilterMarketplaceModal(false, newGenres, saleType);
                setGenres(newGenres);
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
});

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
    <div>
      <FilterWrapper
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
    </div>
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
