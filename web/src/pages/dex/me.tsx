import { useEffect } from 'react'
import { useRouter } from 'next/router'
import { useMe } from 'hooks/useMe'

/**
 * /dex/me — Redirects logged-in users to their own profile page.
 * Falls back to /dex/feed if no profile handle is available yet.
 */
export default function MyProfileRedirect() {
  const router = useRouter()
  const me = useMe()

  useEffect(() => {
    if (me === undefined) return // still loading

    const handle = me?.profile?.userHandle
    if (handle) {
      router.replace(`/dex/users/${handle}`)
    } else {
      // No profile yet (new user or not logged in) — go to feed
      router.replace('/dex/feed')
    }
  }, [me, router])

  // Brief loading state while resolving
  return (
    <div className="flex items-center justify-center min-h-screen bg-black">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
        <p className="text-white/50 text-sm">Loading your profile...</p>
      </div>
    </div>
  )
}
