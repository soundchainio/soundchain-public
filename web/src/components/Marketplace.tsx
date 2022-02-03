import { useModalDispatch, useModalState } from 'contexts/providers/modal';
import { Filter } from 'icons/Filter';
import { GridView } from 'icons/GridView';
import { ListView } from 'icons/ListView';
import { SortListingItemField, SortOrder, TrackQuery, TrackWithListingItem, useListingItemsQuery } from 'lib/graphql';
import React, { useEffect, useState } from 'react';
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

export const Marketplace = () => {
  const pageSize = 15;
  const { dispatchShowFilterMarketplaceModal } = useModalDispatch();
  const { genres: genresFromModal, filterSaleType } = useModalState();
  const [isGrid, setIsGrid] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [genres, setGenres] = useState<GenreLabel[] | undefined>(undefined);
  const [saleType, setSaleType] = useState<SaleTypeLabel | undefined>(undefined);
  const [sorting, setSorting] = useState<SortListingItem>(SortListingItem.CreatedAt);
  const { field, order } = SelectToApolloQuery[sorting];
  const { data, refetch, fetchMore, loading } = useListingItemsQuery({
    variables: {
      page: { first: pageSize },
      sort: { field, order },
      filter: {},
    },
    ssr: false,
  });

  useEffect(() => genresFromModal && setGenres(genresFromModal), [genresFromModal]);
  useEffect(() => filterSaleType && setSaleType(filterSaleType), [filterSaleType]);
  useEffect(() => setTotalCount(data?.listingItems.pageInfo.totalCount || 0), [data]);

  useEffect(() => {
    refetch({
      page: {
        first: pageSize,
      },
      sort: { field, order },
      filter: buildMarketplaceFilter(genres, saleType),
    });
  }, [genres, saleType, refetch, field, order]);

  const loadMore = () =>
    fetchMore({
      variables: {
        page: {
          first: pageSize,
          after: data?.listingItems.pageInfo.endCursor,
        },
        sort: { field, order },
        filter: buildMarketplaceFilter(genres, saleType),
      },
    });

  return (
    <div>
      <div className="flex gap-2 bg-gray-15 p-4 justify-center items-center">
        <div className="flex-1">
          <span className="text-white text-sm font-bold">{`${totalCount} `} </span>
          <span className="text-gray-80 text-sm">Tracks</span>
        </div>
        <button aria-label="List view">
          <ListView color={isGrid ? undefined : 'rainbow'} onClick={() => setIsGrid(false)} />
        </button>
        <button aria-label="Grid view">
          <GridView color={isGrid ? 'rainbow' : undefined} onClick={() => setIsGrid(true)} />
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
      {loading ? (
        isGrid ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 p-4 justify-center">
            <GridSkeleton />
            <GridSkeleton />
            <GridSkeleton />
            <GridSkeleton />
          </div>
        ) : (
          <div className="space-y-2">
            <PostSkeleton />
            <PostSkeleton />
            <PostSkeleton />
          </div>
        )
      ) : !data ? (
        <NoResultFound type="items" />
      ) : (
        <PullToRefresh onRefresh={refetch} className="h-auto">
          <Tracks isGrid={isGrid} tracks={data.listingItems.nodes} />
        </PullToRefresh>
      )}
      {data?.listingItems.pageInfo.hasNextPage && (
        <InfiniteLoader loadMore={loadMore} loadingMessage="Loading Marketplace" />
      )}
    </div>
  );
};

interface TracksProps {
  isGrid: boolean;
  tracks: TrackWithListingItem[] | undefined;
}

const Tracks = ({ isGrid, tracks }: TracksProps) => {
  if (!tracks) return null;
  return (
    <>
      {isGrid ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 p-4 justify-center">
          {tracks.map(track => (
            <TrackGrid key={track.id} track={track} />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {tracks.map(track => (
            <Track key={track.id} track={track as TrackQuery['track']} />
          ))}
        </div>
      )}
    </>
  );
};

const buildMarketplaceFilter = (genres: GenreLabel[] | undefined, saleType: SaleTypeLabel | undefined) => {
  return {
    ...(genres?.length && { genres: genres.map(genre => genre.key) }),
    ...(saleType && { listingItem: { saleType: saleType.key } }),
  };
};
