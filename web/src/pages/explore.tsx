import { Explore } from 'components/pages/ExplorePage/Explore'
import SEO from 'components/SEO'
import { TopNavBarProps } from 'components/TopNavBar'
import { useLayoutContext } from 'hooks/useLayoutContext'
import { cacheFor } from 'lib/apollo'
import { protectPage } from 'lib/protectPage'
import { useEffect, useMemo } from 'react'

export const getServerSideProps = protectPage((context, apolloClient) => {
  return cacheFor(ExplorePage, {}, context, apolloClient)
})

export default function ExplorePage() {
  const { setTopNavBarProps } = useLayoutContext()

  const topNavBarProps: TopNavBarProps = useMemo(
    () => ({
      rightButton: undefined,
      leftButton: undefined,
    }),
    [],
  )

  useEffect(() => {
    setTopNavBarProps(topNavBarProps)
  }, [setTopNavBarProps, topNavBarProps])

  return (
    <>
      <SEO
        title="Explore | SoundChain"
        description="Explore your favorite artists and tracks on SoundChain"
        canonicalUrl="/explore/"
      />
      <Explore />
    </>
  )
}
