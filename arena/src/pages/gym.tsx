/**
 * /gym — Basketball game (single-player shootaround + 1v1 roadmap).
 *
 * Migrated from soundchain.io/gallery3d?theme=gym May 20, 2026. The gym
 * is a sport, the arena is the sports hub — sport goes with sport. Gallery
 * GalleryRoom3D is the existing battle-tested basketball engine (Phase 16.x
 * iteration chain), now hosted on arena.soundchain.io/gym.
 *
 * Themes available: 'gym' (indoor court), 'blacktop' (outdoor city court).
 * Toggle via ?theme= query param.
 */

import { ReactElement, useState } from 'react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/router'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

const GalleryRoom3D = dynamic(() => import('components/GalleryRoom3D'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-black">
      <div className="text-center space-y-2">
        <div className="text-arena-red font-mono text-sm animate-pulse">LOADING THE COURT...</div>
        <div className="text-gray-600 font-mono text-[10px]">Three.js · Mixamo retargets · NBA-spec court</div>
      </div>
    </div>
  ),
})

type GymTheme = 'gym' | 'blacktop'
const THEMES: GymTheme[] = ['gym', 'blacktop']

export default function GymPage() {
  const router = useRouter()
  const themeParam = (router.query.theme as GymTheme) || 'gym'
  const [theme, setTheme] = useState<GymTheme>(THEMES.includes(themeParam) ? themeParam : 'gym')

  return (
    <div className="fixed inset-0 bg-black text-white overflow-hidden">
      {/* Top chrome — back button + theme toggle, minimal so it doesn't fight the game */}
      <div className="absolute top-0 left-0 right-0 z-50 flex items-center justify-between px-3 py-2 bg-gradient-to-b from-black/80 to-transparent pointer-events-none">
        <Link
          href="/"
          className="pointer-events-auto inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-black/70 border border-white/20 text-xs font-mono hover:bg-arena-red/20 hover:border-arena-red transition"
        >
          <ArrowLeft className="w-3 h-3" /> ARENA
        </Link>
        <div className="pointer-events-auto flex gap-1">
          {THEMES.map(t => (
            <button
              key={t}
              onClick={() => setTheme(t)}
              className={`px-2.5 py-1.5 rounded text-[10px] font-mono uppercase transition ${
                theme === t
                  ? 'bg-arena-red/20 text-arena-red border border-arena-red/40'
                  : 'bg-black/70 text-gray-400 border border-white/15 hover:border-white/30'
              }`}
            >
              {t === 'gym' ? '🏀 GYM' : '🏙 BLACKTOP'}
            </button>
          ))}
        </div>
      </div>

      {/* The court — full viewport */}
      <div className="relative w-full h-[100dvh]">
        <GalleryRoom3D ownerHandle="" ownerProfileId={undefined} theme={theme} />
      </div>
    </div>
  )
}

// Bypass ArenaShell — gym needs full viewport for the game canvas
;(GymPage as any).getLayout = (page: ReactElement) => page
