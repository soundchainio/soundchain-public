// Redirect /archive-import → /archive-import (legacy URL backward compat)
import { GetServerSideProps } from 'next'
export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const qs = ctx.resolvedUrl.split('?')[1] || ''
  return { redirect: { destination: '/archive-import' + (qs ? '?' + qs : ''), permanent: true } }
}
export default function Redirect() { return null }
