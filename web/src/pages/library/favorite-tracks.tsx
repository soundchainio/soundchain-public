import { FavoriteTracks } from 'components/LibraryPage/FavoriteTracks'
import { SearchLibrary } from 'components/SearchLibrary'
import SEO from 'components/SEO'
import { TopNavBarProps } from 'components/TopNavBar'
import { useLayoutContext } from 'hooks/useLayoutContext'
import React, { useEffect, useState } from 'react'
import PageFilterWrapper from '../../components/PageFilterWrapper/PageFilterWrapper'
import { SortListingItem } from '../../lib/apollo/sorting'

const topNavBarProps: TopNavBarProps = {
  title: 'Favorite Tracks',
}

export default function FavoriteTracksPage() {
  const [searchTerm, setSearchTerm] = useState<string>('')

  const [isGrid, setIsGrid] = useState(true)
  const [sorting, setSorting] = useState<SortListingItem>(SortListingItem.CreatedAt)

  const { setTopNavBarProps } = useLayoutContext()

  useEffect(() => {
    setTopNavBarProps(topNavBarProps)
  }, [setTopNavBarProps])

  return (
    <>
      <SEO
        title="Favorite Tracks | SoundChain"
        canonicalUrl="/library/favorite-tracks/"
        description="Your SoundChain favorite tracks"
      />
      <PageFilterWrapper label="" sorting={sorting} setSorting={setSorting} setIsGrid={setIsGrid} isGrid={isGrid} />
      <SearchLibrary placeholder="Search tracks..." setSearchTerm={setSearchTerm} />
      <FavoriteTracks sorting={sorting} isGrid={isGrid} searchTerm={searchTerm} />
    </>
  )
}
