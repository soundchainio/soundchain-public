// Redirect /agents → /agents (legacy URL backward compat)
import { GetServerSideProps } from 'next'
export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const qs = ctx.resolvedUrl.split('?')[1] || ''
  return { redirect: { destination: '/agents' + (qs ? '?' + qs : ''), permanent: true } }
}
export default function Redirect() { return null }
