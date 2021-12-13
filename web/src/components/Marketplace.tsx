import { useModalDispatch } from 'contexts/providers/modal';
import { Filter } from 'icons/Filter';
import { GridView } from 'icons/GridView';
import { ListView } from 'icons/ListView';
import { SortListingItemField, SortOrder, TrackQuery, TrackWithListingItem, useListingItemsQuery } from 'lib/graphql';
import React, { useEffect, useState } from 'react';
import { InfiniteLoader } from './InfiniteLoader';
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
  const pageSize = 10;
  const { dispatchShowFilterMarketplaceModal } = useModalDispatch();
  const [isGrid, setIsGrid] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [sorting, setSorting] = useState<SortListingItem>(SortListingItem.PriceAsc);
  const { field, order } = SelectToApolloQuery[sorting];
  const { data, refetch, fetchMore, loading } = useListingItemsQuery({
    variables: {
      page: { first: pageSize },
      sort: { field, order },
    },
  });

  useEffect(() => {
    refetch({
      page: {
        first: pageSize,
      },
      sort: { field, order },
    });
  }, [sorting]);

  useEffect(() => {
    if (!totalCount && data) {
      setTotalCount(data.listingItems.pageInfo.totalCount);
    }
  }, [data?.listingItems.pageInfo.totalCount, totalCount, data]);

  const loadMore = () => {
    fetchMore({
      variables: {
        page: {
          first: pageSize,
          after: data?.listingItems.pageInfo.endCursor,
        },
        sort: { field, order },
      },
    });
  };

  return (
    <div>
      <div className="flex gap-2 bg-gray-15 p-4 justify-center items-center">
        <div className="flex-1">
          <span className="text-white text-sm font-bold">{`${totalCount} `} </span>
          <span className="text-gray-80 text-sm">Tracks</span>
        </div>
        <ListView color={isGrid ? undefined : 'rainbow'} onClick={() => setIsGrid(false)} />
        <GridView color={isGrid ? 'rainbow' : undefined} onClick={() => setIsGrid(true)} />
      </div>
      <div className="flex gap-2 bg-black p-4 justify-center items-center">
        <div className="flex flex-1 items-center">
          <div className="flex cursor-pointer" onClick={() => dispatchShowFilterMarketplaceModal(true)}>
            <Filter />
            <span className="text-white text-xs font-bold pl-1">Filter</span>
          </div>
        </div>
        <span className="text-gray-80 text-xs font-bold">Sort By</span>
        <select
          className="bg-gray-25 text-gray-80 font-bold text-xs rounded-lg border-0"
          name="Wallet"
          id="wallet"
          value={sorting}
          onChange={e => setSorting(e.target.value as SortListingItem)}
        >
          <option value={SortListingItem.PriceAsc}>Least expensive</option>
          <option value={SortListingItem.PriceDesc}>Most expensive</option>
          <option value={SortListingItem.PlaybackCount}>Most listened</option>
          <option value={SortListingItem.CreatedAt}>Newest</option>
        </select>
      </div>
      {!data || loading ? (
        <div className="space-y-2">
          <PostSkeleton />
          <PostSkeleton />
          <PostSkeleton />
        </div>
      ) : (
        <Tracks isGrid={isGrid} tracks={data.listingItems.nodes} />
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
