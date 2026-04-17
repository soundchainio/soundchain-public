/**
 * /dex/explore3d — The Hybrid Grid metaverse
 * Walk through the world, click residents to PORTAL into their personal grid.
 * INTERNODES on the INTERNETS · PORTALNODES at work.
 *
 * Tier 1 (browser): WASD movement, capsule avatars, 60fps
 * Tier 2 (Pro GPU): TODO — full PBR, ray tracing
 * Tier 3 (VR): TODO — WebXR Vision Pro / Quest 3
 * Tier 4 (Ray-Bans): TODO — AR overlay
 */
import { ReactElement } from 'react'
import dynamic from 'next/dynamic'
import { useMe } from 'hooks/useMe'
import { useRouter } from 'next/router'
import { TopNavBar } from 'components/TopNavBar'
import { ArrowLeft } from 'lucide-react'

// IMPORTANT: dynamic import + ssr:false avoids TDZ in webpack bundle
// (same pattern RadioScene4D uses on /radio)
const Explore3DScene = dynamic(() => import('components/Explore3DScene'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-black">
      <div className="text-center space-y-2">
        <div className="text-cyan-400 font-mono text-sm animate-pulse">LOADING THE GRID...</div>
        <div className="text-gray-600 font-mono text-[10px]">Three.js · WebGL · WebGPU-ready</div>
      </div>
    </div>
  ),
})

export default function Explore3DPage() {
  const me = useMe()
  const router = useRouter()

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      <TopNavBar />

      {/* Lower nav pills — so users aren't stuck on Explore 3D */}
      <div className="border-b border-cyan-500/10 bg-black/40 backdrop-blur-md">
        <div className="flex items-center gap-1.5 px-3 pt-2 pb-2">
          <div className="flex-1 overflow-x-auto scrollbar-hide bg-black/60 backdrop-blur-md rounded-full px-2 py-1">
            <div className="flex items-center gap-1.5 min-w-max">
              {[
                ...(me?.profile ? [{ id: 'profile', label: 'Profile', route: `/dex/users/${me.profile.userHandle}` }] : []),
                { id: 'nodes', label: 'Nodes', route: '/dex/nodes' },
                { id: 'explore3d', label: 'Explore 3D', route: '/dex/explore3d' },
                { id: 'land', label: 'Land Atlas', route: '/dex/land' },
                { id: 'gallery3d', label: 'Gallery 3D', route: '/dex/gallery3d' },
                { id: 'arena', label: 'Arena', route: '/dex/arena' },
                { id: 'explore', label: 'Explore', route: '/dex/explore' },
                { id: 'users', label: 'Users', route: '/dex/users' },
                { id: 'radio', label: 'Radio', route: '/radio' },
                { id: 'library', label: 'Library', route: '/dex/library' },
                { id: 'playlist', label: 'Playlists', route: '/dex/playlist' },
                { id: 'archive', label: 'Archive', route: '/dex/archive' },
              ].map(item => (
                <button
                  key={item.id}
                  onClick={() => router.push(item.route)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                    item.id === 'explore3d'
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
      <div className="border-b border-cyan-500/20 bg-black/80 backdrop-blur-md">
        <div className="max-w-[1400px] mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push('/dex/nodes')} className="p-1.5 rounded hover:bg-white/10 transition">
              <ArrowLeft className="w-4 h-4 text-gray-400" />
            </button>
            <div>
              <h1 className="text-sm font-mono font-bold text-cyan-400 tracking-wider">EXPLORE 3D</h1>
              <p className="text-[9px] font-mono text-gray-600">PORTALNODES on the INTERNETS · click any resident to portal in</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[8px] font-mono text-gray-600">Tier 1 · Browser · 60fps</span>
          </div>
        </div>
      </div>

      {/* The Grid — explicit height so canvas always renders */}
      <div className="relative w-full" style={{ height: 'calc(100vh - 200px)', minHeight: '500px' }}>
        <Explore3DScene
          myHandle={me?.profile?.userHandle || 'YOU'}
          myAvatar={me?.profile?.profilePicture}
        />
      </div>
    </div>
  )
}

// Skip default Layout — use our own TopNavBar (matches dex page pattern)
;(Explore3DPage as any).getLayout = (page: ReactElement) => page
