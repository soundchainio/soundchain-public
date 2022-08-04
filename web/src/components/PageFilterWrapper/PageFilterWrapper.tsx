import React from 'react';
import { FilterComponent } from '../Filter/Filter';
import { ListView as ListViewIcon } from '../../icons/ListView';
import { GridView as GridViewIcon } from '../../icons/GridView';
import { FilterWrapperProps } from '../ExplorePageFilterWrapper/ExplorePageFilterWrapper';
import { SortListingItem } from '../../lib/apollo/sorting';

interface PageFilterProps extends Omit<FilterWrapperProps, 'selectedTab' | 'setSelectedTab' | 'totalCount'> {
  label?: string;
}

function PageFilterWrapper(props: PageFilterProps) {
  const { sorting, setSorting, isGrid, setIsGrid, label } = props;

  return (
    <div className="w-full">
      <div className="flex w-full items-center justify-center gap-2 bg-gray-15 p-4">
        {label && <h3 className="text-xl font-semibold text-slate-200">{label || ''}</h3>}

        <div className="flex-1" />
        <FilterComponent
          options={[
            { value: SortListingItem.PlaybackCount, name: 'Most listened' },
            { value: SortListingItem.CreatedAt, name: 'Newest' },
          ]}
          sorting={sorting}
          setSorting={setSorting}
        />

        <button aria-label="List view">
          <ListViewIcon color={isGrid ? undefined : 'rainbow'} onClick={() => setIsGrid(false)} />
        </button>
        <button aria-label="Grid view">
          <GridViewIcon color={isGrid ? 'rainbow' : undefined} onClick={() => setIsGrid(true)} />
        </button>
      </div>
    </div>
  );
}

export default PageFilterWrapper;
