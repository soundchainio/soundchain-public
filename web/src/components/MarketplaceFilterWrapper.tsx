/* eslint-disable react/display-name */

import { useModalDispatch } from 'contexts/providers/modal';
import { Filter } from 'icons/Filter';
import { GridView as GridViewIcon } from 'icons/GridView';
import { ListView as ListViewIcon } from 'icons/ListView';
import { SortListingItem } from 'lib/apollo/sorting';
import React, { Dispatch, memo, SetStateAction } from 'react';
import { GenreLabel } from 'utils/Genres';
import { SaleTypeLabel } from 'utils/SaleTypeLabel';
import { Badge } from './Badge';
import { FilterComponent } from './Filter/Filter';

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

export const MarketplaceFilterWrapper = memo((props: FilterWrapperProps) => {
  const { genres, saleType, sorting, setSorting, setSaleType, setGenres, isGrid, setIsGrid, totalCount = 0 } = props;

  const { dispatchShowFilterMarketplaceModal } = useModalDispatch();

  return (
    <div className="w-full">
      <div className="flex gap-2 w-full bg-gray-15 p-4 justify-center items-center">
        <div className="flex-1">
          <span className="text-white text-sm font-bold">{`${totalCount} `} </span>
          <span className="text-gray-80 text-sm">Tracks</span>
        </div>

        <button
          className="items-center justify-center p-2 hidden md:flex"
          onClick={() => dispatchShowFilterMarketplaceModal(true, genres, saleType)}
        >
          <Filter />
          <span className="text-white text-xs font-bold pl-1">Filter</span>
        </button>

        <FilterComponent sorting={sorting} setSorting={setSorting} />

        <button aria-label="List view">
          <ListViewIcon color={isGrid ? undefined : 'rainbow'} onClick={() => setIsGrid(false)} />
        </button>
        <button aria-label="Grid view">
          <GridViewIcon color={isGrid ? 'rainbow' : undefined} onClick={() => setIsGrid(true)} />
        </button>
      </div>

      <div className='bg-black flex gap-2 w-full p-2 justify-between items-center md:hidden'>
        <button
          className="flex items-center justify-center p-2"
          onClick={() => dispatchShowFilterMarketplaceModal(true, genres, saleType)}
        >
          <Filter />
          <span className="text-white text-xs font-bold pl-1">Filter</span>
        </button>
        <FilterComponent sorting={sorting} setSorting={setSorting} mobile noMarginRight />
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
