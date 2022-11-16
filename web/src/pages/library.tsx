import { SearchBar, TabsMenu } from 'components/common'
import { FavoriteArtists } from 'components/pages/LibraryPage/FavoriteArtists'
import { FavoriteTracks } from 'components/pages/LibraryPage/FavoriteTracks'
import SEO from 'components/SEO'
import { TopNavBarProps } from 'components/TopNavBar'
import { useLayoutContext } from 'hooks/useLayoutContext'
import { SortListingItem } from 'lib/apollo/sorting'
import { useEffect, useMemo, useState } from 'react'

enum LibraryTab {
  FAVORITE_TRACKS = 'Favorite Tracks',
  FAVORITE_ARTISTS = 'Favorite Artists',
}

export default function LibraryPage() {
  const { setTopNavBarProps } = useLayoutContext()

  const topNavBarProps: TopNavBarProps = useMemo(
    () => ({
      title: 'Library',
      rightButton: undefined,
      leftButton: undefined,
    }),
    [],
  )

  const [selectedTab, setSelectedTab] = useState<LibraryTab>(LibraryTab.FAVORITE_TRACKS)
  const [searchTerm, setSearchterm] = useState('')
  const [isGrid, setIsGrid] = useState(true)
  const [sorting, setSorting] = useState<SortListingItem>(SortListingItem.CreatedAt)

  const libraryTabList = [LibraryTab.FAVORITE_TRACKS, LibraryTab.FAVORITE_ARTISTS]

  useEffect(() => {
    setTopNavBarProps(topNavBarProps)
  }, [setTopNavBarProps, topNavBarProps])

  return (
    <>
      <SEO title="Library | SoundChain" canonicalUrl="/library/" description="SoundChain Library" />

      <TabsMenu
        isGrid={isGrid}
        setIsGrid={setIsGrid}
        sorting={sorting}
        setSorting={setSorting}
        tabList={libraryTabList}
        selectedTab={selectedTab}
        setSelectedTab={setSelectedTab}
        hideSortBy={!Boolean(selectedTab === LibraryTab.FAVORITE_ARTISTS)}
      />

      <SearchBar setSearchTerm={setSearchterm} />

      {selectedTab === LibraryTab.FAVORITE_TRACKS && (
        <FavoriteTracks searchTerm={searchTerm} isGrid={isGrid} sorting={sorting} />
      )}

      {selectedTab === LibraryTab.FAVORITE_ARTISTS && <FavoriteArtists searchTerm={searchTerm} isGrid={isGrid} />}
    </>
  )
}
