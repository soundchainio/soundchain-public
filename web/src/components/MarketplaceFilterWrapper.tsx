/* eslint-disable react/display-name */

import { useModalDispatch } from 'contexts/providers/modal'
import { Filter } from 'icons/Filter'
import { GridView as GridViewIcon } from 'icons/GridView'
import { ListView as ListViewIcon } from 'icons/ListView'
import { SortListingItem } from 'lib/apollo/sorting'
import { Dispatch, memo, SetStateAction } from 'react'
import { GenreLabel } from 'utils/Genres'
import { SaleTypeLabel } from 'utils/SaleTypeLabel'
import { Badge } from './common/Badges/Badge'
import { FilterComponent } from './Filter/Filter'

interface FilterWrapperProps {
  totalCount?: number; // Optional prop for total item count
  isGrid?: boolean;
  setIsGrid: React.Dispatch<React.SetStateAction<boolean>>;
  genres?: GenreLabel[];
  setGenres: React.Dispatch<React.SetStateAction<GenreLabel[] | undefined>>;
  saleType?: SaleTypeLabel;
  setSaleType: React.Dispatch<React.SetStateAction<SaleTypeLabel | undefined>>;
  acceptsMATIC?: boolean;
  setAcceptsMATIC: React.Dispatch<React.SetStateAction<boolean | undefined>>;
  acceptsOGUN?: boolean;
  setAcceptsOGUN: React.Dispatch<React.SetStateAction<boolean | undefined>>;
  sorting: SortListingItem;
  setSorting: React.Dispatch<React.SetStateAction<SortListingItem>>;
}

export const MarketplaceFilterWrapper = memo((props: FilterWrapperProps) => {
  const {
    genres,
    saleType,
    acceptsMATIC,
    acceptsOGUN,
    sorting,
    setSorting,
    setSaleType,
    setGenres,
    setAcceptsMATIC,
    setAcceptsOGUN,
    isGrid,
    setIsGrid,
    totalCount = 0,
  } = props

  const { dispatchShowFilterMarketplaceModal } = useModalDispatch()

  return (
    <div className="w-full">
      <div className="flex w-full items-center justify-center gap-2 bg-gray-15 p-4">
        <div className="flex-1">
          <span className="text-sm font-bold text-white">{`${totalCount} `} </span>
          <span className="text-sm text-gray-80">Tracks</span>
        </div>

        <button
          className="hidden items-center justify-center p-2 md:flex"
          onClick={() => dispatchShowFilterMarketplaceModal(true, genres, saleType, acceptsMATIC, acceptsOGUN)}
        >
          <Filter />
          <span className="pl-1 text-xs font-bold text-white">Filter</span>
        </button>

        <FilterComponent sorting={sorting} setSorting={setSorting} />

        <button aria-label="List view">
          <ListViewIcon color={isGrid ? undefined : 'rainbow'} onClick={() => setIsGrid(false)} />
        </button>
        <button aria-label="Grid view">
          <GridViewIcon color={isGrid ? 'rainbow' : undefined} onClick={() => setIsGrid(true)} />
        </button>
      </div>

      <div className="flex w-full items-center justify-between gap-2 bg-black p-2 md:hidden">
        <button
          className="flex items-center justify-center p-2"
          onClick={() => dispatchShowFilterMarketplaceModal(true, genres, saleType, undefined, undefined)}
        >
          <Filter />
          <span className="pl-1 text-xs font-bold text-white">Filter</span>
        </button>
        <FilterComponent sorting={sorting} setSorting={setSorting} mobile noMarginRight />
      </div>

      {(saleType || Boolean(genres?.length) || acceptsMATIC || acceptsOGUN) && (
        <div className="flex flex-wrap gap-2 p-4">
          {saleType && (
            <Badge
              label={saleType.label}
              onDelete={() => {
                dispatchShowFilterMarketplaceModal(false, genres, undefined, acceptsMATIC, acceptsOGUN)
                setSaleType(undefined)
              }}
            />
          )}
          {genres?.map(genre => (
            <Badge
              key={genre.key}
              label={genre.label}
              onDelete={() => {
                const newGenres = genres.filter(it => it !== genre)
                dispatchShowFilterMarketplaceModal(false, newGenres, saleType, acceptsMATIC, acceptsOGUN)
                setGenres(newGenres)
              }}
            />
          ))}
          {acceptsMATIC && (
            <Badge
              label={'MATIC'}
              onDelete={() => {
                dispatchShowFilterMarketplaceModal(false, genres, saleType, undefined, undefined)
                setAcceptsMATIC(undefined)
              }}
            />
          )}
          {acceptsOGUN && (
            <Badge
              label={'OGUN'}
              onDelete={() => {
                dispatchShowFilterMarketplaceModal(false, genres, saleType, undefined, undefined)
                setAcceptsOGUN(undefined)
              }}
            />
          )}
        </div>
      )}
    </div>
  )
})
