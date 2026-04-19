import { Logo } from 'icons/Logo'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { ReactNode } from 'react'

interface MarketplaceNavProps {
  title: string
  icon?: ReactNode
}

export const MarketplaceNav = ({ title, icon }: MarketplaceNavProps) => {
  const router = useRouter()

  return (
    <nav className="backdrop-blur-xl bg-gray-900/95 border-b border-cyan-500/20 px-2 sm:px-4 lg:px-6 py-1.5 sm:py-2 sticky top-0 z-50 shadow-lg">
      <div className="flex items-center justify-between max-w-screen-2xl mx-auto">
        {/* Left: Logo + Back */}
        <div className="flex items-center space-x-3">
          <Link href="/nodes" className="flex items-center space-x-2 flex-shrink-0">
            <Logo className="h-9 w-9 sm:h-12 sm:w-12" />
            <span className="text-xl font-bold bg-gradient-to-r from-orange-400 via-yellow-400 to-cyan-400 bg-clip-text text-transparent hidden lg:block">
              SoundChain
            </span>
          </Link>
          <div className="w-px h-6 bg-white/10 hidden sm:block" />
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1.5 text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm hidden sm:inline">Back</span>
          </button>
        </div>

        {/* Center: Page Title */}
        <div className="flex items-center gap-2">
          {icon}
          <h1 className="text-sm sm:text-base font-bold text-white">{title}</h1>
        </div>

        {/* Right: Quick Links */}
        <div className="flex items-center space-x-3">
          <Link href="/nodes" className="text-xs text-gray-400 hover:text-cyan-400 transition-colors hidden sm:inline">
            Home
          </Link>
          <Link href="/dex/marketplace" className="text-xs text-gray-400 hover:text-cyan-400 transition-colors">
            Market
          </Link>
        </div>
      </div>
    </nav>
  )
}
