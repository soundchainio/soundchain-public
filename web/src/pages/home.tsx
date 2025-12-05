import SEO from 'components/SEO'
import { TopNavBarProps } from 'components/TopNavBar'
import { useLayoutContext } from 'hooks/useLayoutContext'
import { cacheFor, createApolloClient } from 'lib/apollo'
import { MeDocument, MeQuery } from 'lib/graphql'
import { GetServerSideProps } from 'next'
import dynamic from 'next/dynamic'
import { useEffect, useMemo } from 'react'

// Load these client-side only to avoid GraphQL hook SSR issues
const Feed = dynamic(() => import('components/Feed').then(mod => ({ default: mod.Feed })), { ssr: false })
const Posts = dynamic(() => import('components/Post/Posts').then(mod => ({ default: mod.Posts })), { ssr: false })

interface HomePageProps {
  me?: MeQuery['me']
}

export const getServerSideProps: GetServerSideProps<HomePageProps> = async context => {
  // GHOST: Redirect all /home requests to /dex (legacy page deprecated)
  return {
    redirect: {
      destination: '/dex',
      permanent: true, // 301 redirect - SEO friendly
    },
  }
}

export default function HomePage({ me }: HomePageProps) {
  const { setTopNavBarProps } = useLayoutContext()

  const topNavBarProps: TopNavBarProps = useMemo(
    () => ({
      title: 'Feed',
    }),
    [],
  )

  useEffect(() => {
    setTopNavBarProps(topNavBarProps)
  }, [setTopNavBarProps, topNavBarProps])

  return (
    <>
      <SEO title="SoundChain" description="Connecting people to music" canonicalUrl="/" />
      <div className="mx-auto h-full max-w-2xl pt-3">{me ? <Feed /> : <Posts />}</div>
    </>
  )
}
