import { GetServerSideProps } from 'next'

// GHOST: Redirect /explore to /dex/explore (legacy page deprecated)
export const getServerSideProps: GetServerSideProps = async () => {
  return {
    redirect: {
      destination: '/dex/explore',
      permanent: true, // 301 redirect - SEO friendly
    },
  }
}

// This component won't render due to redirect
export default function ExplorePage() {
  return null
}
