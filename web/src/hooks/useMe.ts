import { useMeQuery } from 'lib/graphql'

// Counter so the warning only fires once per session — not per render. Pre-fix
// this hook console.error'd every render of every component outside an Apollo
// provider. On Pulse that meant 100s/sec during streaming, each error
// triggering DevTools repaints + battery drain on Frank's phone.
let warned = false

export const useMe = () => {
  try {
    const result = useMeQuery()
    return result.data?.me
  } catch (error) {
    // Render outside ApolloProvider — return undefined silently so the
    // component degrades gracefully (most consumers null-check `me` already).
    if (!warned && typeof window !== 'undefined') {
      warned = true
      // eslint-disable-next-line no-console
      console.warn('[useMe] called outside ApolloProvider — returning undefined. (Once per session.)')
    }
    return undefined
  }
}
