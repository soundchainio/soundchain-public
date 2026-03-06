// Redirect to unified create account page
import { useEffect } from 'react'
import { useRouter } from 'next/router'

export default function CreateAccountPage() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to the unified single-page create account flow
    router.replace('/create-account/unified')
  }, [router])

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
      <div className="retro-text text-cyan-400">Loading...</div>
    </div>
  )
}
