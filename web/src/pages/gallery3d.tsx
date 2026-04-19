/**
 * /gallery3d?handle=username&theme=cyberpunk
 * Personal NFT/SCid gallery room — Nodeverse killer feature.
 */
import { ReactElement, useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { useMe } from 'hooks/useMe'
import { useRouter } from 'next/router'
import { TopNavBar } from 'components/TopNavBar'
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

const THEMES = ['cyberpunk', 'modern', 'vinyl', 'vault'] as const
type Theme = typeof THEMES[number]

export default function Gallery3DPage() {
  const me = useMe()
  const router = useRouter()
  const handleParam = (router.query.handle as string) || me?.profile?.userHandle || ''
  const themeParam = (router.query.theme as Theme) || 'cyberpunk'
  const [theme, setTheme] = useState<Theme>(themeParam)
  const [ownerProfileId, setOwnerProfileId] = useState<string | undefined>(undefined)

  // Resolve handle → profileId
  useEffect(() => {
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
      <TopNavBar />

      {/* Lower nav pills */}
      <div className="border-b border-yellow-500/10 bg-black/40 backdrop-blur-md">
        <div className="flex items-center gap-1.5 px-3 pt-2 pb-2">
          <div className="flex-1 overflow-x-auto scrollbar-hide bg-black/60 backdrop-blur-md rounded-full px-2 py-1">
            <div className="flex items-center gap-1.5 min-w-max">
              {[
                ...(me?.profile ? [{ id: 'profile', label: 'Profile', route: `/dex/users/${me.profile.userHandle}` }] : []),
                { id: 'nodes', label: 'Nodes', route: '/nodes' },
                { id: 'explore3d', label: 'Explore 3D', route: '/explore3d' },
                { id: 'gallery3d', label: 'Gallery 3D', route: '/gallery3d' },
                { id: 'arena', label: 'Arena', route: '/arena' },
                { id: 'explore', label: 'Explore', route: '/explore' },
                { id: 'users', label: 'Users', route: '/users' },
                { id: 'radio', label: 'Radio', route: '/radio' },
                { id: 'moltbook', label: 'Moltbook', route: '/backend' },
                { id: 'library', label: 'Library', route: '/library' },
                { id: 'playlist', label: 'Playlists', route: '/playlist' },
                { id: 'archive', label: 'Archive', route: '/archive' },
              ].map(item => (
                <button
                  key={item.id}
                  onClick={() => router.push(item.route)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                    item.id === 'gallery3d'
                      ? 'bg-white/15 text-white border border-white/20'
                      : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Header */}
      <div className="border-b border-yellow-500/20 bg-black/80 backdrop-blur-md">
        <div className="max-w-[1400px] mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push('/explore3d')} className="p-1.5 rounded hover:bg-white/10 transition">
              <ArrowLeft className="w-4 h-4 text-gray-400" />
            </button>
            <div>
              <h1 className="text-sm font-mono font-bold text-yellow-400 tracking-wider">GALLERY 3D · @{handleParam || 'visitor'}</h1>
              <p className="text-[9px] font-mono text-gray-600">NODEVERSE · personal art collection · walk through, listen, collect</p>
            </div>
          </div>
          {/* Theme switcher */}
          <div className="flex items-center gap-1">
            <Palette className="w-3 h-3 text-gray-500" />
            {THEMES.map(t => (
              <button
                key={t}
                onClick={() => setTheme(t)}
                className={`px-2 py-1 rounded text-[9px] font-mono uppercase transition ${theme === t ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' : 'bg-white/[0.02] text-gray-500 border border-white/5 hover:text-white'}`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* The Gallery */}
      <div className="relative w-full" style={{ height: 'calc(100vh - 200px)', minHeight: '500px' }}>
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
