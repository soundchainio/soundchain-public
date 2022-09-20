import { ExploreUsersGridView } from 'components/ExploreUsersGridView'
import { ExploreUsersListView } from 'components/ExploreUsersListView'
import { TopNavBarProps } from 'components/TopNavBar'
import { useLayoutContext } from 'hooks/useLayoutContext'
import { SortListingItem } from 'lib/apollo/sorting'
import React, { useEffect, useState } from 'react'
import { LibrarySearchBar } from './LibrarySearchBar'

const topNavBarProps: TopNavBarProps = {
  title: 'Artists',
}

interface Props {
  isFavoriteArtistsOpen?: boolean
}

export const ArtistsPage = (props: Props) => {
  const { isFavoriteArtistsOpen } = props

  const [searchTerm, setSearchTerm] = useState('')
  const { setTopNavBarProps } = useLayoutContext()

  const [isGrid, setIsGrid] = useState(true)
  const [sorting, setSorting] = useState<SortListingItem>(SortListingItem.CreatedAt)

  useEffect(() => {
    setTopNavBarProps(topNavBarProps)
  }, [setTopNavBarProps])

  return (
    <>
      {isFavoriteArtistsOpen && (
        <>
          <LibrarySearchBar
            placeholder="Search artists..."
            setSearchTerm={setSearchTerm}
            sorting={sorting}
            setSorting={setSorting}
            setIsGrid={setIsGrid}
            isGrid={isGrid}
          />

          {isGrid ? <ExploreUsersGridView searchTerm={searchTerm} /> : <ExploreUsersListView searchTerm={searchTerm} />}
        </>
      )}
    </>
  )
}
