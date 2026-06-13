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
  Home, Trophy, Compass, Users as UsersIcon,
  Radio as RadioIcon, Music, ListMusic, Archive as ArchiveIcon, User, Briefcase,
  Map as MapIcon,
} from 'lucide-react'
import { useMe } from 'hooks/useMe'

const ARENA_URL = 'https://arena.soundchain.io?portal=soundchain'

type Accent = 'red' | 'violet' | 'cyan' | 'lime' | 'orange' | 'neutral' | 'sky' | 'pink' | 'emerald' | 'amber' | 'fuchsia'

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
  orange: 'bg-orange-500/15 text-orange-300 border border-orange-400/40 shadow-[0_0_12px_rgba(251,146,60,0.25)]',
  sky: 'bg-sky-500/15 text-sky-300 border border-sky-400/40 shadow-[0_0_12px_rgba(56,189,248,0.25)]',
  pink: 'bg-pink-500/15 text-pink-300 border border-pink-400/40 shadow-[0_0_12px_rgba(244,114,182,0.25)]',
  emerald: 'bg-emerald-500/15 text-emerald-300 border border-emerald-400/40 shadow-[0_0_12px_rgba(52,211,153,0.25)]',
  amber: 'bg-amber-500/15 text-amber-300 border border-amber-400/40 shadow-[0_0_12px_rgba(251,191,36,0.25)]',
  fuchsia: 'bg-fuchsia-500/15 text-fuchsia-300 border border-fuchsia-400/40 shadow-[0_0_12px_rgba(232,121,249,0.25)]',
  neutral: 'bg-white/15 text-white border border-white/25',
}

const ACCENT_IDLE: Record<Accent, string> = {
  red: 'text-red-300/85 hover:text-red-200 hover:bg-red-500/10 border border-red-500/25 hover:border-red-400/50',
  violet: 'text-violet-300/85 hover:text-violet-200 hover:bg-violet-500/10 border border-violet-500/25 hover:border-violet-400/50',
  cyan: 'text-cyan-300/85 hover:text-cyan-200 hover:bg-cyan-500/10 border border-cyan-500/25 hover:border-cyan-400/50',
  lime: 'text-lime-300/85 hover:text-lime-200 hover:bg-lime-500/10 border border-lime-500/25 hover:border-lime-400/50',
  orange: 'text-orange-300/85 hover:text-orange-200 hover:bg-orange-500/10 border border-orange-500/25 hover:border-orange-400/50',
  sky: 'text-sky-300/85 hover:text-sky-200 hover:bg-sky-500/10 border border-sky-500/25 hover:border-sky-400/50',
  pink: 'text-pink-300/85 hover:text-pink-200 hover:bg-pink-500/10 border border-pink-500/25 hover:border-pink-400/50',
  emerald: 'text-emerald-300/85 hover:text-emerald-200 hover:bg-emerald-500/10 border border-emerald-500/25 hover:border-emerald-400/50',
  amber: 'text-amber-300/85 hover:text-amber-200 hover:bg-amber-500/10 border border-amber-500/25 hover:border-amber-400/50',
  fuchsia: 'text-fuchsia-300/85 hover:text-fuchsia-200 hover:bg-fuchsia-500/10 border border-fuchsia-500/25 hover:border-fuchsia-400/50',
  neutral: 'text-gray-300 hover:text-white hover:bg-white/8 border border-white/10 hover:border-white/25',
}

type Props = {
  active: 'profile' | 'nodes' | 'arena' | 'manager' | 'gallery3d' | 'explore3d' | 'land' | 'radio' | 'explore' | 'users' | 'library' | 'playlist' | 'archive' | 'deck' | 'moltbook' | (string & {})
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
    // Always visible (was logged-in-only, so signed-out surfaces — e.g. the
    // anvil testbed — showed no Profile pill at all). Logged out → /login,
    // same pattern as the Manager pill below.
    { id: 'profile', label: 'Profile', route: me?.profile ? `/users/${me.profile.userHandle}` : '/login', icon: User, accent: 'sky' as Accent },
    { id: 'nodes', label: 'Nodes', route: '/nodes', icon: Home, accent: 'cyan' },
    { id: 'arena', label: 'Arena', route: ARENA_URL, icon: Trophy, accent: 'red', external: true },
    // Manager — Jeremy's booking marketplace (agents ⇄ artists book each other).
    // Routes to the viewer's own manager page; /login when signed out (the SSR
    // [handle] page 404s without a real handle, and there's no /manager index).
    { id: 'manager', label: 'Manager', route: me?.profile ? `/manager/${me.profile.userHandle}` : '/login', icon: Briefcase, accent: 'violet' },
    // May 27, 2026 — Gallery 3D / Explore 3D / Land Atlas pills GHOSTED from
    // global nav. Gallery 3D moved to the profile/wall page as an in-place
    // tab (?tab=gallery3d); Explore 3D + Land Atlas were not seeing daily use.
    // Routes /gallery3d, /explore3d, /land remain reachable by direct URL.
    // To restore as global pills, uncomment.
    // { id: 'gallery3d', label: 'Gallery 3D', route: '/gallery3d', icon: ImageIcon, accent: 'violet' },
    // { id: 'explore3d', label: 'Explore 3D', route: '/explore3d', icon: Globe2, accent: 'cyan' },
    // { id: 'land', label: 'Land Atlas', route: '/land', icon: Map, accent: 'lime' },
    { id: 'radio', label: 'Radio', route: '/radio', icon: RadioIcon, accent: 'orange' },
    { id: 'explore', label: 'Explore', route: '/explore', icon: Compass, accent: 'emerald' },
    { id: 'users', label: 'Users', route: '/users', icon: UsersIcon, accent: 'pink' },
    { id: 'library', label: 'Library', route: '/library', icon: Music, accent: 'amber' },
    { id: 'playlist', label: 'Playlists', route: '/playlist', icon: ListMusic, accent: 'fuchsia' },
    { id: 'archive', label: 'Archive', route: '/archive', icon: ArchiveIcon, accent: 'lime' },
    // Deck Map — the SoundChain Starship station map: every pill is a module
    // on the vessel; fly the camera, tap a module, ENTER routes to its page.
    { id: 'deck', label: 'Deck Map', route: '/deck', icon: MapIcon, accent: 'orange' },
  ]

  const pillRow = (
    <div className="flex-1 overflow-x-auto scrollbar-hide bg-black/60 backdrop-blur-md rounded-full px-1.5 py-0.5">
      <div className="flex items-center gap-1 min-w-max">
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
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap transition-all ${cls}`}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon className="w-3 h-3" strokeWidth={2.25} />
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
