import { GetServerSideProps } from 'next'

// GHOST: Redirect /explore to /dex/explore (legacy page deprecated)
export const getServerSideProps: GetServerSideProps = async () => {
  return {
    redirect: {
      destination: '/dex/explore',
      permanent: false, // was self-redirecting to '/explore' → infinite loop (pre-launch audit blocker)
    },
  }
}

// This component won't render due to redirect
export default function ExplorePage() {
  return null
}
