import Link from 'next/link'
import { useRouter } from 'next/router'
import { ReactNode, useEffect, useState } from 'react'
import {
  Trophy,
  Swords,
  Home,
  ExternalLink,
  Sun,
  Moon,
  Activity,
  Flag,
  Menu,
  X,
  Zap,
  Dribbble,
  ArrowLeft,
} from 'lucide-react'
import { getIdentity, isUrlAvatar } from '@/lib/identity'
import { ArenaIdentityModal } from './ArenaIdentityModal'

interface ArenaShellProps {
  children: ReactNode
}

const NAV = [
  { href: '/',              label: 'Hub',     icon: Home },
  { href: '/live',          label: 'Live',    icon: Activity, accent: true },
  { href: '/worldcup',      label: 'World Cup', icon: Trophy, accent: true },
  { href: '/nba',           label: 'NBA',     icon: Trophy },
  { href: '/nhl',           label: 'NHL',     icon: Trophy },
  { href: '/mlb',           label: 'MLB',     icon: Trophy },
  { href: '/nfl',           label: 'NFL',     icon: Trophy },
  { href: '/wnba',          label: 'WNBA',    icon: Trophy },
  { href: '/f1',            label: 'F1',      icon: Flag },
  { href: '/wwe',           label: 'WWE',     icon: Zap },
  { href: '/boxing',        label: 'Boxing',  icon: Zap },
  { href: '/horse-racing',  label: 'Horse',   icon: Flag },
  { href: '/soccer',        label: 'Soccer',  icon: Trophy },
  { href: '/gym',           label: 'Gym',     icon: Dribbble, accent: true },
  { href: '/fantasy',       label: 'Fantasy', icon: Trophy },
  { href: '/picks',         label: 'Picks',   icon: Swords },
]

function ThemeToggle() {
  const [isDark, setIsDark] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    setIsDark(document.documentElement.classList.contains('dark'))
  }, [])

  const toggle = () => {
    const next = !isDark
    setIsDark(next)
    if (next) {
      document.documentElement.classList.add('dark')
      try { localStorage.setItem('arenaTheme', 'dark') } catch (_) {}
    } else {
      document.documentElement.classList.remove('dark')
      try { localStorage.setItem('arenaTheme', 'light') } catch (_) {}
    }
  }

  // Don't render icon until mounted to avoid hydration mismatch
  return (
    <button
      onClick={toggle}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className="flex items-center justify-center w-9 h-9 rounded-full border border-arena-border-l dark:border-arena-border-d hover:bg-arena-red/10 hover:border-arena-red transition"
    >
      {mounted ? (
        isDark ? <Sun className="w-4 h-4 text-arena-yellow" /> : <Moon className="w-4 h-4 text-arena-text-l" />
      ) : (
        <span className="w-4 h-4" />
      )}
    </button>
  )
}

export function ArenaShell({ children }: ArenaShellProps) {
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)
  const [portalSC, setPortalSC] = useState(false)
  const [showIdentity, setShowIdentity] = useState(false)
  const [myAvatar, setMyAvatar] = useState<string>('🏟️')

  const refreshAvatar = () => setMyAvatar(getIdentity().avatar)
  useEffect(() => { refreshAvatar() }, [])

  // Portal-back affordance — when the user arrived from soundchain.io via the
  // Arena pill (web/src/components/MainPillNav.tsx adds `?portal=soundchain`),
  // we surface a prominent "← Back to SoundChain" pill instead of the subtle
  // generic soundchain.io link. Flag persists for the session so in-arena
  // navigation (Hub → NBA → game modal) doesn't lose the return path.
  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const fromQuery = new URLSearchParams(window.location.search).get('portal') === 'soundchain'
      const cached = sessionStorage.getItem('arenaPortalSC') === '1'
      if (fromQuery) {
        sessionStorage.setItem('arenaPortalSC', '1')
        setPortalSC(true)
      } else if (cached) {
        setPortalSC(true)
      }
    } catch (_) {}
  }, [router.asPath])

  const isActive = (href: string) =>
    href === '/' ? router.pathname === '/' : router.pathname.startsWith(href)

  return (
    <div className="min-h-screen flex flex-col bg-arena-paper dark:bg-arena-carbon text-arena-text-l dark:text-arena-text-d">
      {/* Top sticky nav */}
      <header className="sticky top-0 z-50 arena-safe-top bg-arena-paper/85 dark:bg-arena-carbon/85 backdrop-blur-xl border-b border-arena-border-l dark:border-arena-border-d">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          {/* Wordmark */}
          <Link href="/" className="flex items-center gap-2 flex-shrink-0">
            <span className="text-xs sm:text-sm font-black tracking-[0.25em] arena-hologram-text">
              ARENA
            </span>
            <span className="hidden sm:inline text-[10px] font-mono tracking-widest text-arena-muted-l dark:text-arena-muted-d">
              · soundchain
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden lg:flex items-center gap-1">
            {NAV.map(({ href, label, icon: Icon, accent }) => (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition ${
                  isActive(href)
                    ? 'bg-arena-red text-white shadow-sm'
                    : accent
                      ? 'text-arena-red border border-arena-red/40 hover:bg-arena-red hover:text-white'
                      : 'text-arena-muted-l dark:text-arena-muted-d hover:text-arena-text-l dark:hover:text-arena-text-d hover:bg-arena-border-l dark:hover:bg-arena-border-d'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{label}</span>
                {accent && isActive(href) === false && <span className="arena-live-dot ml-0.5" />}
              </Link>
            ))}
          </nav>

          {/* Right cluster */}
          <div className="flex items-center gap-2">
            <ThemeToggle />
            {/* Profile / identity — set or edit your handle + avatar pic */}
            <button
              onClick={() => setShowIdentity(true)}
              aria-label="Your profile"
              className="flex items-center justify-center w-9 h-9 rounded-full border border-arena-border-l dark:border-arena-border-d hover:border-arena-red transition overflow-hidden"
            >
              {isUrlAvatar(myAvatar) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={myAvatar} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-lg leading-none">{myAvatar}</span>
              )}
            </button>
            {portalSC ? (
              <a
                href="https://soundchain.io"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold text-white bg-arena-red border border-arena-red shadow-sm hover:opacity-90 transition"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">SoundChain</span>
              </a>
            ) : (
              <a
                href="https://soundchain.io"
                target="_blank"
                rel="noopener noreferrer"
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold text-arena-muted-l dark:text-arena-muted-d hover:text-arena-text-l dark:hover:text-arena-text-d border border-arena-border-l dark:border-arena-border-d hover:border-arena-red transition"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span className="hidden md:inline">soundchain.io</span>
              </a>
            )}
            {/* Mobile menu trigger */}
            <button
              onClick={() => setMenuOpen((m) => !m)}
              aria-label="Toggle menu"
              className="lg:hidden flex items-center justify-center w-9 h-9 rounded-full border border-arena-border-l dark:border-arena-border-d hover:bg-arena-red/10 transition"
            >
              {menuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Mobile nav drawer */}
        {menuOpen && (
          <nav className="lg:hidden border-t border-arena-border-l dark:border-arena-border-d bg-arena-paper dark:bg-arena-carbon">
            <div className="max-w-7xl mx-auto px-4 py-3 grid grid-cols-3 gap-2">
              {NAV.map(({ href, label, icon: Icon, accent }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setMenuOpen(false)}
                  className={`flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg text-xs font-bold transition ${
                    isActive(href)
                      ? 'bg-arena-red text-white'
                      : accent
                        ? 'text-arena-red border border-arena-red/40'
                        : 'text-arena-muted-l dark:text-arena-muted-d border border-arena-border-l dark:border-arena-border-d'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{label}</span>
                </Link>
              ))}
              {portalSC ? (
                <a
                  href="https://soundchain.io"
                  className="col-span-3 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg text-xs font-bold text-white bg-arena-red border border-arena-red"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Back to SoundChain
                </a>
              ) : (
                <a
                  href="https://soundchain.io"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="col-span-3 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg text-xs font-bold text-arena-muted-l dark:text-arena-muted-d border border-arena-border-l dark:border-arena-border-d"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> soundchain.io
                </a>
              )}
            </div>
          </nav>
        )}
      </header>

      <main className="flex-1">{children}</main>

      {showIdentity && (
        <ArenaIdentityModal onClose={() => setShowIdentity(false)} onSaved={refreshAvatar} />
      )}

      <footer className="arena-safe-bottom border-t border-arena-border-l dark:border-arena-border-d bg-arena-paper dark:bg-arena-carbon mt-12">
        <div className="max-w-7xl mx-auto px-4 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-arena-muted-l dark:text-arena-muted-d">
          <div className="flex items-center gap-3">
            <span className="font-mono tracking-wider">© SoundChain Arena</span>
            <span>·</span>
            <span>Free-to-play. Real stats. Bragging rights.</span>
          </div>
          <div className="flex items-center gap-3">
            <a href="https://soundchain.io" className="hover:text-arena-red transition">soundchain.io</a>
            <span>·</span>
            <a href="https://soundchain.io/feedback" className="hover:text-arena-red transition">Feedback</a>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default ArenaShell
