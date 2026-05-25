/**
 * /gallery3d?handle=username&theme=cyberpunk
 * Personal NFT/SCid gallery room — Nodeverse killer feature.
 */
import { ReactElement, useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { useMe } from 'hooks/useMe'
import { useRouter } from 'next/router'
import { DexNavBar } from 'components/DexNavBar'
import MainPillNav from 'components/MainPillNav'
import { ArrowLeft, Palette } from 'lucide-react'

const GalleryRoom3D = dynamic(() => import('components/GalleryRoom3D'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-black">
      <div className="text-center space-y-2">
        <div className="text-yellow-400 font-mono text-sm animate-pulse">LOADING THE GALLERY...</div>
        <div className="text-gray-600 font-mono text-[10px]">Three.js · NFT frames · proximity audio</div>
      </div>
    </div>
  ),
})

// May 20, 2026 — gym + blacktop themes migrated to arena.soundchain.io/gym
// (sport goes with sport). Anyone hitting ?theme=gym or ?theme=blacktop is
// redirected at mount-time. Gallery3D stays here for the music/NFT themes.
const THEMES = ['cyberpunk', 'modern', 'vinyl', 'vault', 'city'] as const
type Theme = typeof THEMES[number]

const ARENA_GYM_URL = 'https://arena.soundchain.io/gym'

export default function Gallery3DPage() {
  const me = useMe()
  const router = useRouter()
  const handleParam = (router.query.handle as string) || me?.profile?.userHandle || ''
  const rawThemeParam = router.query.theme as string | undefined
  const themeParam = (THEMES.includes(rawThemeParam as Theme) ? rawThemeParam : 'cyberpunk') as Theme
  const [theme, setTheme] = useState<Theme>(themeParam)
  const [ownerProfileId, setOwnerProfileId] = useState<string | undefined>(undefined)

  // Redirect legacy ?theme=gym / ?theme=blacktop traffic to arena.
  useEffect(() => {
    if (rawThemeParam === 'gym' || rawThemeParam === 'blacktop') {
      const dest = rawThemeParam === 'blacktop' ? `${ARENA_GYM_URL}?theme=blacktop` : ARENA_GYM_URL
      window.location.replace(dest)
    }
  }, [rawThemeParam])

  // Resolve handle → profileId (auto-loads YOUR gallery if no handle param)
  useEffect(() => {
    // If no handle param but user is logged in, show their own gallery
    if (!handleParam && me?.profile?.id) {
      setOwnerProfileId(me.profile.id)
      return
    }
    if (!handleParam) return
    if (handleParam === me?.profile?.userHandle) {
      setOwnerProfileId(me.profile.id)
      return
    }
    fetch(`/api/feed/profile?handle=${handleParam}`)
      .then(r => r.json())
      .then(data => {
        if (data.profile?.id) setOwnerProfileId(data.profile.id)
      })
      .catch(() => {})
  }, [handleParam, me?.profile])

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      <DexNavBar />

      <MainPillNav active="gallery3d" borderClass="border-yellow-500/10" />

      {/* Header */}
      <div className="border-b border-yellow-500/20 bg-black/80 backdrop-blur-md">
        <div className="max-w-[1400px] mx-auto px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={() => router.push('/explore3d')} className="p-1.5 rounded hover:bg-white/10 transition shrink-0">
              <ArrowLeft className="w-4 h-4 text-gray-400" />
            </button>
            <div className="min-w-0">
              <h1 className="text-sm font-mono font-bold text-yellow-400 tracking-wider truncate">GALLERY 3D · @{handleParam || 'visitor'}</h1>
              <p className="text-[9px] font-mono text-gray-600 truncate">NODEVERSE · personal art collection · walk through, listen, collect</p>
            </div>
          </div>
          {/* Theme switcher — scrollable on narrow screens so GYM + BLACKTOP
              don't get cropped off-screen on mobile. */}
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0 sm:max-w-[60%]">
            <Palette className="w-3 h-3 text-gray-500 shrink-0" />
            {THEMES.map(t => (
              <button
                key={t}
                onClick={() => setTheme(t)}
                className={`px-2 py-1 rounded text-[9px] font-mono uppercase transition shrink-0 ${theme === t ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' : 'bg-white/[0.02] text-gray-500 border border-white/5 hover:text-white'}`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* The Gallery */}
      <div className="relative w-full min-h-[400px] h-[calc(100vh-200px)]">
        {handleParam ? (
          <GalleryRoom3D ownerHandle={handleParam} ownerProfileId={ownerProfileId} theme={theme} />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-500 font-mono text-sm">
            Sign in to see your gallery, or pass ?handle=username
          </div>
        )}
      </div>
    </div>
  )
}

;(Gallery3DPage as any).getLayout = (page: ReactElement) => page
