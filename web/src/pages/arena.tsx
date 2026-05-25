/**
 * /arena — server-side redirect to arena.soundchain.io
 *
 * Arena was carved out into a standalone Next.js app at arena.soundchain.io on
 * May 4, 2026 (`c3a688a`). This soundchain.io page used to render an old console-
 * gaming stub (Parsec / GeForce Now matchmaking) which never shipped and was
 * confusing co-workers who hit the Arena pill expecting live sports.
 *
 * Now: any GET to /arena (with or without query string) 302s to arena.soundchain.io
 * with `?portal=soundchain` so ArenaShell can render a "← Back to SoundChain"
 * return pill. Session cookies are domain-scoped so the user lands on arena, then
 * returns via the portal pill with their soundchain.io session still intact.
 */
import { GetServerSideProps } from 'next'

export const getServerSideProps: GetServerSideProps = async ({ query }) => {
  const extras = Object.entries(query)
    .filter(([k]) => k !== 'portal')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(Array.isArray(v) ? v[0] : (v ?? ''))}`)
    .join('&')
  const qs = extras ? `&${extras}` : ''
  return {
    redirect: {
      destination: `https://arena.soundchain.io/?portal=soundchain${qs}`,
      permanent: false,
    },
  }
}

export default function ArenaRedirect() {
  return null
}
