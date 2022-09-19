import { FavoriteTracks } from 'components/FavoriteTracks'
import { TopNavBarProps } from 'components/TopNavBar'
import { useLayoutContext } from 'hooks/useLayoutContext'
import React, { useEffect, useState } from 'react'
import { SortListingItem } from '../../lib/apollo/sorting'
import { LibrarySearchBar } from './LibrarySearchBar'

const topNavBarProps: TopNavBarProps = {
  title: 'Favorite Tracks',
}

interface Props {
  isFavoriteTracksOpen?: boolean
}

export const FavoriteTracksPage = (props: Props) => {
  const { isFavoriteTracksOpen } = props

  const [searchTerm, setSearchTerm] = useState('')

  const [isGrid, setIsGrid] = useState(true)
  const [sorting, setSorting] = useState<SortListingItem>(SortListingItem.CreatedAt)

  const { setTopNavBarProps } = useLayoutContext()

  useEffect(() => {
    setTopNavBarProps(topNavBarProps)
  }, [setTopNavBarProps])

  return (
    <>
      {isFavoriteTracksOpen && (
        <LibrarySearchBar
          placeholder="Search tracks..."
          setSearchTerm={setSearchTerm}
          sorting={sorting}
          setSorting={setSorting}
          setIsGrid={setIsGrid}
          isGrid={isGrid}
        />
      )}

      <FavoriteTracks
        sorting={sorting}
        isGrid={isGrid}
        searchTerm={searchTerm}
        isFavoriteTracksOpen={isFavoriteTracksOpen}
      />
    </>
  )
}
