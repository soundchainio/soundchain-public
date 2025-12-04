import { GetServerSideProps } from 'next'

// Redirect all traffic to /dex
export const getServerSideProps: GetServerSideProps = async () => {
  return {
    redirect: {
      destination: '/dex',
      permanent: false,
    },
  }
}

export default function Index() {
  return null
}
