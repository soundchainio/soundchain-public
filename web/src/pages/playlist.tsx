import { useRouter } from 'next/router'
import { useEffect } from 'react'
import { useMe } from 'hooks/useMe'

/** /playlist → redirect to logged-in user's playlists tab on their profile */
export default function PlaylistRedirect() {
  const router = useRouter()
  const me = useMe()

  useEffect(() => {
    const handle = me?.profile?.userHandle || me?.handle
    if (handle) {
      router.replace(`/users/${handle}?tab=playlists`)
    } else if (me === null) {
      // Explicitly not logged in
      router.replace('/nodes')
    }
    // me === undefined means still loading — wait
  }, [me, router])

  return null
}
