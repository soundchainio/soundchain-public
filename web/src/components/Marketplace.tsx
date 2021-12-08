import { Filter } from 'icons/Filter';
import { GridView } from 'icons/GridView';
import { ListView } from 'icons/ListView';
import { SortOrder, SortTrackField, useListingItemsQuery } from 'lib/graphql';
import React, { useState } from 'react';
import { PostSkeleton } from './PostSkeleton';
import { TrackGrid } from './TrackGrid';
interface Song {
  src: string;
  title?: string | null;
  trackId: string;
  artist?: string | null;
  art?: string | null;
  isFavorite: boolean | null;
  playbackCount: string;
  favoriteCount: number;
  saleType: string;
  price: string;
}
export const Marketplace = () => {
  const [isGrid, setIsGrid] = useState(true);

  const { data } = useListingItemsQuery({
    variables: {
      sort: { field: SortTrackField.CreatedAt, order: SortOrder.Desc },
    },
  });

  if (!data) {
    return (
      <div className="space-y-2">
        <PostSkeleton />
        <PostSkeleton />
        <PostSkeleton />
      </div>
    );
  }
  console.log(data);

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
        <select className="bg-gray-25 text-gray-80 font-bold text-xs rounded-lg border-0" name="Wallet" id="wallet">
          <option value={2}>Least expensive</option>
          <option value={2}>Most expensive</option>
          <option value={1}>Newest</option>
        </select>
      </div>
      <div className="grid grid-cols-2 gap-2 p-4">
        {data.listingItems.nodes.map(track => (
          <TrackGrid key={track.id} track={track} />
        ))}
      </div>
    </div>
  );
};
