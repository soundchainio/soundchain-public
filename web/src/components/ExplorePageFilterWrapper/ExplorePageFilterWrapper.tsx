/* eslint-disable react/display-name */

import { GridView as GridViewIcon } from 'icons/GridView'
import { ListView as ListViewIcon } from 'icons/ListView'
import { SortListingItem } from 'lib/apollo/sorting'
import React, { Dispatch, memo, SetStateAction } from 'react'
import { FilterComponent } from '../Filter/Filter'
import { ExploreTab } from 'types/ExploreTabType'
import { ExploreTabs } from 'components/ExploreTabs'

export type FilterWrapperProps = {
  totalCount?: number
  isGrid?: boolean
  sorting: SortListingItem
  setSorting: Dispatch<SetStateAction<SortListingItem>>
  setIsGrid: Dispatch<SetStateAction<boolean>>
  selectedTab: ExploreTab
  setSelectedTab: Dispatch<SetStateAction<ExploreTab>>
}

export const ExplorePageFilterWrapper = memo((props: FilterWrapperProps) => {
  const { sorting, setSorting, isGrid, setIsGrid, selectedTab, setSelectedTab } = props

  return (
    <div className="w-full">
      <div className="relative flex w-full flex-row items-center justify-center bg-gray-15 p-4">
        <div className="isolate flex-1">
          <div className="inset-0 z-0 flex items-center justify-center lg:absolute">
            <ExploreTabs selectedTab={selectedTab} setSelectedTab={setSelectedTab} />
          </div>
        </div>

        <FilterComponent
          options={[
            { value: SortListingItem.PlaybackCount, name: 'Most listened' },
            { value: SortListingItem.CreatedAt, name: 'Newest' },
          ]}
          sorting={sorting}
          setSorting={setSorting}
        />

        <div className="z-10 flex gap-2">
          <button aria-label="List view">
            <ListViewIcon color={isGrid ? undefined : 'rainbow'} onClick={() => setIsGrid(false)} />
          </button>
          <button aria-label="Grid view">
            <GridViewIcon color={isGrid ? 'rainbow' : undefined} onClick={() => setIsGrid(true)} />
          </button>
        </div>
      </div>
    </div>
  )
})
