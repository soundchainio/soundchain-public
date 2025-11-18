import dynamic from 'next/dynamic'
import SEO from 'components/SEO'
import { TopNavBarProps } from 'components/TopNavBar'
import { useLayoutContext } from 'hooks/useLayoutContext'
import { GetServerSideProps } from 'next'
import { useEffect, useMemo } from 'react'

const Marketplace = dynamic(
  () => import('components/Marketplace').then(mod => ({ default: mod.Marketplace })),
  { ssr: false }
)

interface HomePageProps {}

export const getServerSideProps: GetServerSideProps<HomePageProps> = async context => {
  return { props: {} }
}

export default function HomePage({}: HomePageProps) {
  const { setTopNavBarProps } = useLayoutContext()
  const topNavBarProps: TopNavBarProps = useMemo(
    () => ({
      title: 'Marketplace',
    }),
    [],
  )
  
  useEffect(() => {
    setTopNavBarProps(topNavBarProps)
  }, [setTopNavBarProps, topNavBarProps])
  
  return (
    <>
      <SEO
        title="Marketplace | SoundChain"
        canonicalUrl="/marketplace"
        description="Discover unique tracks on SoundChain NFT Marketplace"
      />
      <Marketplace />
    </>
  )
}
