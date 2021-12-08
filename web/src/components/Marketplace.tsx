import { Filter } from 'icons/Filter';
import { GridView } from 'icons/GridView';
import { ListView } from 'icons/ListView';
import { SortListingItemField, SortOrder, TrackQuery, useListingItemsQuery } from 'lib/graphql';
import React, { useEffect, useState } from 'react';
import { PostSkeleton } from './PostSkeleton';
import { Track } from './Track';
import { TrackGrid } from './TrackGrid';

enum SortListingItemPrice {
  PriceAsc = 'PriceAsc',
  PriceDesc = 'PriceDesc',
}

export const Marketplace = () => {
  const [isGrid, setIsGrid] = useState(false);
  const [sorting, setSorting] = useState<SortListingItemField>(SortListingItemField.CreatedAt);
  const [priceSorting, setPriceSorting] = useState<SortOrder>(SortOrder.Asc);

  const { data, refetch } = useListingItemsQuery({
    variables: {
      sort: { field: SortListingItemField.CreatedAt, order: SortOrder.Desc },
    },
  });

  useEffect(() => {
    refetch({
      sort: { field: sorting, order: priceSorting },
    });
  }, [sorting, priceSorting]);

  if (!data) {
    return (
      <div className="space-y-2">
        <PostSkeleton />
        <PostSkeleton />
        <PostSkeleton />
      </div>
    );
  }

  return (
    <div>
      <div className="flex gap-2 bg-gray-15 p-4 justify-center items-center">
        <div className="flex-1">
          <span className="text-white text-sm font-bold">12,346 </span>
          <span className="text-gray-80 text-sm">Tracks</span>
        </div>
        <ListView color={isGrid ? undefined : 'rainbow'} onClick={() => setIsGrid(false)} />
        <GridView color={isGrid ? 'rainbow' : undefined} onClick={() => setIsGrid(true)} />
      </div>
      <div className="flex gap-2 bg-black p-4 justify-center items-center">
        <div className="flex flex-1 items-center">
          <Filter />
          <span className="text-white text-xs font-bold pl-1">Filter</span>
        </div>
        <span className="text-gray-80 text-xs font-bold">Sort By</span>
        <select
          className="bg-gray-25 text-gray-80 font-bold text-xs rounded-lg border-0"
          name="Wallet"
          id="wallet"
          onChange={e => {
            if (SortListingItemPrice.PriceAsc === e.target.value) {
              setSorting(SortListingItemField.Price);
              setPriceSorting(SortOrder.Asc);
            } else if (SortListingItemPrice.PriceDesc === e.target.value) {
              setSorting(SortListingItemField.Price);
              setPriceSorting(SortOrder.Desc);
            } else if (SortListingItemField.PlaybackCount === e.target.value) {
              setSorting(SortListingItemField.PlaybackCount);
              setPriceSorting(SortOrder.Desc);
            } else {
              setSorting(SortListingItemField.CreatedAt);
              setPriceSorting(SortOrder.Desc);
            }
          }}
        >
          <option value={SortListingItemPrice.PriceAsc}>Least expensive</option>
          <option value={SortListingItemPrice.PriceDesc}>Most expensive</option>
          <option value={SortListingItemField.PlaybackCount}>Most listened</option>
          <option value={SortListingItemField.CreatedAt}>Newest</option>
        </select>
      </div>
      {isGrid ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 p-4 justify-center">
          {data.listingItems.nodes.map(track => (
            <TrackGrid key={track.id} track={track} />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {data.listingItems.nodes.map(track => (
            <Track key={track.id} track={track as TrackQuery['track']} />
          ))}
        </div>
      )}
    </div>
  );
};
