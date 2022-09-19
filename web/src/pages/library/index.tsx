import SEO from 'components/SEO'
import { TopNavBarProps } from 'components/TopNavBar'
import { useLayoutContext } from 'hooks/useLayoutContext'
import { Artist } from 'icons/Artist'
import { Heart } from 'icons/Heart'
import { cacheFor } from 'lib/apollo'
import { MeDocument, MeQuery } from 'lib/graphql'
import { protectPage } from 'lib/protectPage'
import React, { useEffect, useMemo, useState } from 'react'
import { ArtistsPage, FavoriteTracksPage, Favoritebar } from 'components/Library'
interface HomePageProps {
  me?: MeQuery['me']
}

export const getServerSideProps = protectPage(async (context, apolloClient) => {
  const { data } = await apolloClient.query({
    query: MeDocument,
    context,
  })

  return cacheFor(LibraryPage, { me: data.me }, context, apolloClient)
})

export default function LibraryPage({}: HomePageProps) {
  const { setTopNavBarProps } = useLayoutContext()

  const [isFavoriteTracksOpen, setIsFavoriteTracksOpen] = useState(true)
  const [isFavoriteArtistsOpen, setIsFavoriteArtistsOpen] = useState(true)

  const topNavBarProps: TopNavBarProps = useMemo(
    () => ({
      title: 'Library',
    }),
    [],
  )

  useEffect(() => {
    setTopNavBarProps(topNavBarProps)
  }, [setTopNavBarProps, topNavBarProps])

  return (
    <>
      <SEO title="Library | SoundChain" canonicalUrl="/library/" description="SoundChain Library" />
      <Favoritebar
        title="Favorite Tracks"
        setState={setIsFavoriteTracksOpen}
        stateValue={isFavoriteTracksOpen}
        icon={<Heart fill="gray" className="mr-2" />}
      >
        <FavoriteTracksPage isFavoriteTracksOpen={isFavoriteTracksOpen} />
      </Favoritebar>

      <Favoritebar
        title="Favorite Artists"
        setState={setIsFavoriteArtistsOpen}
        stateValue={isFavoriteArtistsOpen}
        icon={<Artist fill="gray" className="mr-2" />}
      >
        <ArtistsPage isFavoriteArtistsOpen={isFavoriteArtistsOpen} />
      </Favoritebar>
    </>
  )
}
