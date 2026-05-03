import Link from 'next/link'
import { useRouter } from 'next/router'
import { ReactNode } from 'react'
import { Trophy, Swords, Home, ExternalLink } from 'lucide-react'

interface ArenaShellProps {
  children: ReactNode
}

const NAV = [
  { href: '/', label: 'Hub', icon: Home },
  { href: '/fantasy', label: 'Fantasy', icon: Trophy },
  { href: '/picks', label: 'Picks', icon: Swords },
]

export function ArenaShell({ children }: ArenaShellProps) {
  const router = useRouter()
  const isActive = (href: string) =>
    href === '/' ? router.pathname === '/' : router.pathname.startsWith(href)

  return (
    <div className="min-h-screen bg-arena-bg text-white flex flex-col">
      {/* Top sticky nav */}
      <header className="sticky top-0 z-50 arena-safe-top bg-black/80 backdrop-blur-xl border-b border-arena-border">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2 group">
            <span className="text-xs font-black tracking-[0.3em] arena-hologram-text">
              SOUNDCHAIN ARENA
            </span>
          </Link>

          <nav className="flex items-center gap-1 sm:gap-2">
            {NAV.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition ${
                  isActive(href)
                    ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/40'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{label}</span>
              </Link>
            ))}
            <a
              href="https://soundchain.io"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold text-gray-400 hover:text-white hover:bg-white/5 transition border border-arena-border"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="hidden md:inline">soundchain.io</span>
            </a>
          </nav>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="arena-safe-bottom border-t border-arena-border bg-black/40 mt-12">
        <div className="max-w-6xl mx-auto px-4 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-500">
          <div className="flex items-center gap-3">
            <span className="font-mono tracking-wider">© SoundChain Arena</span>
            <span>·</span>
            <span>Free-to-play. Bragging rights only.</span>
          </div>
          <div className="flex items-center gap-3">
            <a href="https://soundchain.io" className="hover:text-white transition">soundchain.io</a>
            <span>·</span>
            <a href="https://soundchain.io/feedback" className="hover:text-white transition">Feedback</a>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default ArenaShell
