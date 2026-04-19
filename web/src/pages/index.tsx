import { GetServerSideProps } from 'next'

// All entry points land on /dex/nodes — Nodes is the new feed home.
export const getServerSideProps: GetServerSideProps = async () => {
  return {
    redirect: {
      destination: '/dex/nodes',
      permanent: false,
    },
  }
}

export default function Index() {
  return null
}
