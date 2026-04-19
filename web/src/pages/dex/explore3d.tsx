// Redirect /explore3d → /explore3d (legacy URL backward compat)
import { GetServerSideProps } from 'next'
export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const qs = ctx.resolvedUrl.split('?')[1] || ''
  return { redirect: { destination: '/explore3d' + (qs ? '?' + qs : ''), permanent: true } }
}
export default function Redirect() { return null }
