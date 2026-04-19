// /dex → /nodes (legacy URL backward compat)
import { GetServerSideProps } from 'next'
export const getServerSideProps: GetServerSideProps = async () => {
  return { redirect: { destination: '/nodes', permanent: true } }
}
export default function Redirect() { return null }
