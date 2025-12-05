import { GetServerSideProps } from 'next'

// GHOST: Redirect /library to /dex/library (legacy page deprecated)
export const getServerSideProps: GetServerSideProps = async () => {
  return {
    redirect: {
      destination: '/dex/library',
      permanent: true, // 301 redirect - SEO friendly
    },
  }
}

// This component won't render due to redirect
export default function LibraryPage() {
  return null
}
