import { GetServerSideProps } from 'next'

// GHOST: Redirect /marketplace to /dex/feed (standalone marketplace retired, storefronts live on profiles)
export const getServerSideProps: GetServerSideProps = async () => {
  return {
    redirect: {
      destination: '/dex/feed',
      permanent: true, // 301 redirect - SEO friendly
    },
  }
}

// This component won't render due to redirect
export default function MarketplacePage() {
  return null
}
