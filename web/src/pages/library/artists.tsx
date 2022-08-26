import { Artists } from 'components/Artists'
import { SearchLibrary } from 'components/SearchLibrary'
import SEO from 'components/SEO'
import { TopNavBarProps } from 'components/TopNavBar'
import { useLayoutContext } from 'hooks/useLayoutContext'
import React, { useEffect, useState } from 'react'

const topNavBarProps: TopNavBarProps = {
  title: 'Artists',
}

export default function ArtistsPage() {
  const [searchTerm, setSearchTerm] = useState<string>('')
  const { setTopNavBarProps } = useLayoutContext()

  useEffect(() => {
    setTopNavBarProps(topNavBarProps)
  }, [setTopNavBarProps])

  return (
    <>
      <SEO title="Artists | SoundChain" canonicalUrl="/library/artists" description="SoundChain Artists" />
      <SearchLibrary placeholder="Search artists..." setSearchTerm={setSearchTerm} />
      <Artists searchTerm={searchTerm} />
    </>
  )
}
