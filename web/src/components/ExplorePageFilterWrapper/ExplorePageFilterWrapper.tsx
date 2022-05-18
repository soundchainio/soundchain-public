/* eslint-disable react/display-name */

import { useModalDispatch } from 'contexts/providers/modal';
import { GridView as GridViewIcon } from 'icons/GridView';
import { ListView as ListViewIcon } from 'icons/ListView';
import { SortListingItem } from 'lib/apollo/sorting';
import React, { Dispatch, memo, SetStateAction, useState } from 'react';
import { Badge } from '../Badge';
import { FilterComponent } from '../Filter/Filter';
import { ExploreTab } from 'types/ExploreTabType';
import { ExploreTabs } from 'components/ExploreTabs';
import { SaleTypeLabel, saleTypes } from '../../utils/SaleTypeLabel';
import { GenreLabel } from '../../utils/Genres';

export type FilterWrapperProps = {
  totalCount?: number;
  isGrid?: boolean;
  sorting: SortListingItem;
  setSorting: Dispatch<SetStateAction<SortListingItem>>;
  setIsGrid: Dispatch<SetStateAction<boolean>>;
  selectedTab: ExploreTab;
  setSelectedTab: Dispatch<SetStateAction<ExploreTab>>;
};

export const ExplorePageFilterWrapper = memo((props: FilterWrapperProps) => {
  const { sorting, setSorting, isGrid, setIsGrid, totalCount = 0, selectedTab, setSelectedTab } = props;
  const [saleType, setSaleType] = useState<SaleTypeLabel | undefined>(saleTypes[0]);

  const { dispatchShowFilterMarketplaceModal } = useModalDispatch();

  return (
    <div className='w-full'>
      <div className='flex flex-row relative w-full bg-gray-15 p-4 justify-center items-center'>
        <h3 className='text-slate-200 hidden md:flex font-semibold'>Explore</h3>
        <div className='flex-1'>
          <div className='lg:absolute inset-0 flex items-center justify-center'>
            <ExploreTabs selectedTab={selectedTab} setSelectedTab={setSelectedTab} />
          </div>
        </div>

        <FilterComponent options={[
          { value: SortListingItem.PlaybackCount, name: 'Most listened' },
          { value: SortListingItem.CreatedAt, name: 'Newest' },
        ]} sorting={sorting} setSorting={setSorting} />

        <div className='flex gap-2'>
          <button aria-label='List view'>
            <ListViewIcon color={isGrid ? undefined : 'rainbow'} onClick={() => setIsGrid(false)} />
          </button>
          <button aria-label='Grid view'>
            <GridViewIcon color={isGrid ? 'rainbow' : undefined} onClick={() => setIsGrid(true)} />
          </button>
        </div>
      </div>
    </div>
  );
});
