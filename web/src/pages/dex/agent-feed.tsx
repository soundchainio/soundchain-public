// Redirect /agent-feed → /agent-feed (legacy URL backward compat)
import { GetServerSideProps } from 'next'
export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const qs = ctx.resolvedUrl.split('?')[1] || ''
  return { redirect: { destination: '/agent-feed' + (qs ? '?' + qs : ''), permanent: true } }
}
export default function Redirect() { return null }
