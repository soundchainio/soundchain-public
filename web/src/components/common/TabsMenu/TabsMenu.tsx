/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react/display-name */

import { GridView as GridViewIcon } from 'icons/GridView'
import { ListView as ListViewIcon } from 'icons/ListView'
import { SortListingItem } from 'lib/apollo/sorting'
import React, { Dispatch, memo, SetStateAction } from 'react'
import { FilterComponent } from 'components/Filter/Filter'
import { Tabs } from './Tabs'

export type Props = {
  isGrid?: boolean
  sorting: SortListingItem
  setSorting: Dispatch<SetStateAction<SortListingItem>>
  setIsGrid: Dispatch<SetStateAction<boolean>>
  selectedTab: any
  setSelectedTab: Dispatch<SetStateAction<any>>
  tabList: string[]
}

export const TabsMenu = memo((props: Props) => {
  const { sorting, setSorting, isGrid, setIsGrid, tabList, selectedTab, setSelectedTab } = props

  return (
    <div className="w-full">
      <div className="relative flex w-full flex-row items-center justify-center bg-gray-15 p-4">
        <div className="isolate flex-1">
          <div className="inset-0 z-0 flex items-center justify-center lg:absolute">
            <Tabs tabList={tabList} selectedTab={selectedTab} setSelectedTab={setSelectedTab} />
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
