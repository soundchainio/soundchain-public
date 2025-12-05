import { GetServerSideProps } from 'next'

// GHOST: Redirect /wallet to /dex/wallet (legacy page deprecated)
export const getServerSideProps: GetServerSideProps = async () => {
  return {
    redirect: {
      destination: '/dex/wallet',
      permanent: true, // 301 redirect - SEO friendly
    },
  }
}

// This component won't render due to redirect
export default function WalletPage() {
  return null
}
