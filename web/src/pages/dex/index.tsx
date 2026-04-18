// /dex → redirect to /dex/nodes (the new Nodeverse landing page)
// The old /dex feed view is deprecated — Nodes page is the new home.
import { GetServerSideProps } from 'next'

export const getServerSideProps: GetServerSideProps = async () => {
  return { redirect: { destination: '/dex/nodes', permanent: false } }
}

export default function DexRedirect() {
  return null
}
