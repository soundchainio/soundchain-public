import { GetServerSideProps } from 'next'

// GHOST: Redirect /marketplace to /dex/marketplace (legacy page deprecated)
export const getServerSideProps: GetServerSideProps = async () => {
  return {
    redirect: {
      destination: '/dex/marketplace',
      permanent: true, // 301 redirect - SEO friendly
    },
  }
}

// This component won't render due to redirect
export default function MarketplacePage() {
  return null
}
