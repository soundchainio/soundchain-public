/**
 * MainPillNav — feature-row pill bar mounted under DexNavBar on /nodes, /explore3d,
 * /gallery3d, /land, /dex/*. Replaces the inline pill block that was copied across
 * 5 pages with subtle gray-on-black styling that co-workers couldn't recognize as
 * features.
 *
 * Each pill has an icon + accent class. The 4 "feature" pills (Arena, Gallery 3D,
 * Explore 3D, Land) render with a colored ring + bolder text so they read as
 * destinations, not nav crumbs. Utility pills (Radio, Library, Playlists, etc.)
 * stay quieter but still get an icon + brighter base text than today's gray-400.
 *
 * Arena pill is special: it lives on arena.soundchain.io, not soundchain.io. Tap
 * triggers `window.location.assign('https://arena.soundchain.io?portal=soundchain')`
 * so the user lands on arena with a portal-back affordance.
 */
import { useRouter } from 'next/router'
import {
  Home, Trophy, ImageIcon, Globe2, Map, Compass, Users as UsersIcon,
  Radio as RadioIcon, Music, ListMusic, Archive as ArchiveIcon, User
} from 'lucide-react'
import { useMe } from 'hooks/useMe'

const ARENA_URL = 'https://arena.soundchain.io?portal=soundchain'

type Accent = 'red' | 'violet' | 'cyan' | 'lime' | 'orange' | 'neutral'

type PillItem = {
  id: string
  label: string
  route: string
  icon: typeof Home
  accent: Accent
  external?: boolean
}

const ACCENT_ACTIVE: Record<Accent, string> = {
  red: 'bg-red-500/15 text-red-300 border border-red-400/40 shadow-[0_0_12px_rgba(248,113,113,0.25)]',
  violet: 'bg-violet-500/15 text-violet-300 border border-violet-400/40 shadow-[0_0_12px_rgba(167,139,250,0.25)]',
  cyan: 'bg-cyan-500/15 text-cyan-300 border border-cyan-400/40 shadow-[0_0_12px_rgba(34,211,238,0.25)]',
  lime: 'bg-lime-500/15 text-lime-300 border border-lime-400/40 shadow-[0_0_12px_rgba(163,230,53,0.25)]',
  orange: 'bg-orange-500/15 text-orange-300 border border-orange-400/40',
  neutral: 'bg-white/15 text-white border border-white/25',
}

const ACCENT_IDLE: Record<Accent, string> = {
  red: 'text-red-300/85 hover:text-red-200 hover:bg-red-500/10 border border-red-500/25 hover:border-red-400/50',
  violet: 'text-violet-300/85 hover:text-violet-200 hover:bg-violet-500/10 border border-violet-500/25 hover:border-violet-400/50',
  cyan: 'text-cyan-300/85 hover:text-cyan-200 hover:bg-cyan-500/10 border border-cyan-500/25 hover:border-cyan-400/50',
  lime: 'text-lime-300/85 hover:text-lime-200 hover:bg-lime-500/10 border border-lime-500/25 hover:border-lime-400/50',
  orange: 'text-orange-300/85 hover:text-orange-200 hover:bg-orange-500/10 border border-orange-500/25 hover:border-orange-400/50',
  neutral: 'text-gray-300 hover:text-white hover:bg-white/8 border border-white/10 hover:border-white/25',
}

type Props = {
  active: 'profile' | 'nodes' | 'arena' | 'gallery3d' | 'explore3d' | 'land' | 'radio' | 'explore' | 'users' | 'library' | 'playlist' | 'archive' | 'moltbook' | (string & {})
  borderClass?: string
  /** Fired before navigation. Used by dex/[...slug].tsx to collapse the bio panel before route change. */
  beforeNavigate?: (id: string) => void
  /** When true, omits the outer border-b + bg wrapper. Use when host already supplies a container. */
  bare?: boolean
}

export default function MainPillNav({ active, borderClass = 'border-white/5', beforeNavigate, bare = false }: Props) {
  const router = useRouter()
  const me = useMe()

  const items: PillItem[] = [
    ...(me?.profile ? [{ id: 'profile', label: 'Profile', route: `/users/${me.profile.userHandle}`, icon: User, accent: 'neutral' as Accent }] : []),
    { id: 'nodes', label: 'Nodes', route: '/nodes', icon: Home, accent: 'neutral' },
    { id: 'arena', label: 'Arena', route: ARENA_URL, icon: Trophy, accent: 'red', external: true },
    { id: 'gallery3d', label: 'Gallery 3D', route: '/gallery3d', icon: ImageIcon, accent: 'violet' },
    { id: 'explore3d', label: 'Explore 3D', route: '/explore3d', icon: Globe2, accent: 'cyan' },
    { id: 'land', label: 'Land Atlas', route: '/land', icon: Map, accent: 'lime' },
    { id: 'radio', label: 'Radio', route: '/radio', icon: RadioIcon, accent: 'orange' },
    { id: 'explore', label: 'Explore', route: '/explore', icon: Compass, accent: 'neutral' },
    { id: 'users', label: 'Users', route: '/users', icon: UsersIcon, accent: 'neutral' },
    { id: 'library', label: 'Library', route: '/library', icon: Music, accent: 'neutral' },
    { id: 'playlist', label: 'Playlists', route: '/playlist', icon: ListMusic, accent: 'neutral' },
    { id: 'archive', label: 'Archive', route: '/archive', icon: ArchiveIcon, accent: 'neutral' },
  ]

  const pillRow = (
    <div className="flex-1 overflow-x-auto scrollbar-hide bg-black/60 backdrop-blur-md rounded-full px-2 py-1">
      <div className="flex items-center gap-1.5 min-w-max">
        {items.map(item => {
          const Icon = item.icon
          const isActive = item.id === active
          const cls = isActive ? ACCENT_ACTIVE[item.accent] : ACCENT_IDLE[item.accent]
          return (
            <button
              key={item.id}
              onClick={() => {
                if (beforeNavigate) beforeNavigate(item.id)
                if (item.external) {
                  window.location.assign(item.route)
                } else {
                  router.push(item.route)
                }
              }}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${cls}`}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon className="w-3.5 h-3.5" strokeWidth={2.25} />
              <span>{item.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )

  if (bare) return pillRow

  return (
    <div className={`border-b ${borderClass} bg-black/40 backdrop-blur-md`}>
      <div className="flex items-center gap-1.5 px-3 pt-2 pb-2">
        {pillRow}
      </div>
    </div>
  )
}
