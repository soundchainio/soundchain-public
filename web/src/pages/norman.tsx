/**
 * /norman — server-side redirect to lucy.soundchain.io
 *
 * (Frank, Jun 1 2026) Lucy was carved out into a standalone app at
 * lucy.soundchain.io (May 20, 2026). This in-site /norman chat page is retired
 * to cut overhead — the AI surface now lives on its own subdomain, same as
 * Arena (arena.soundchain.io) and Mint (mint.soundchain.io). Entry point is the
 * "Lucy AI" item in the avatar dropdown.
 *
 * Any GET to /norman (with or without query) 302s to lucy.soundchain.io with
 * `?portal=soundchain` so Lucy renders a "← Back to SoundChain" chevron for
 * users already logged in here. The old 838-line chat page lives in git history.
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
      destination: `https://lucy.soundchain.io/?portal=soundchain${qs}`,
      permanent: false,
    },
  }
}

export default function NormanRedirect() {
  return null
}
