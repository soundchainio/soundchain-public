import { useModalDispatch } from 'contexts/ModalContext'
import { useHideBottomNavBar } from 'hooks/useHideBottomNavBar'
import { useMe } from 'hooks/useMe'
import { Home, Compass, Library, Store, Plus, BarChart3, Settings } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/router'

import { Logo } from '../icons/Logo'

// Clean, minimal nav item - OpenSea/Rarible inspired
const NavItem = ({
  href,
  label,
  icon: Icon,
  isActive,
  onClick
}: {
  href?: string
  label: string
  icon: React.ElementType
  isActive?: boolean
  onClick?: () => void
}) => {
  const content = (
    <div
      onClick={onClick}
      className={`
        flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer
        ${isActive
          ? 'bg-white/10 text-white'
          : 'text-gray-400 hover:text-white hover:bg-white/5'
        }
      `}
    >
      <Icon className="w-4 h-4" />
      <span className="hidden lg:inline">{label}</span>
    </div>
  )

  if (href) {
    return <Link href={href} passHref>{content}</Link>
  }
  return content
}

export const NavBar = () => {
  const { dispatchShowCreateModal } = useModalDispatch()
  const router = useRouter()
  const me = useMe()
  const { isMinting } = useHideBottomNavBar()
  const currentPath = router.pathname

  const handleCreateClick = () => {
    me ? dispatchShowCreateModal(true) : router.push('/login')
  }

  // Check if path matches for active state
  const isActive = (path: string) => {
    if (path === '/dex' && currentPath === '/dex') return true
    if (path !== '/dex' && currentPath.startsWith(path)) return true
    return false
  }

  return (
    <nav className="flex h-14 items-center bg-black/95 backdrop-blur-sm border-b border-white/5">
      <div className="flex w-full items-center justify-between px-4">
        {/* Logo */}
        <Link href="/" passHref className="flex items-center gap-3">
          <Logo className="h-7 w-auto" />
          <span className="hidden xl:block text-white font-semibold text-lg">SoundChain</span>
        </Link>

        {/* Center Nav - Clean & Minimal */}
        <div className="flex items-center gap-1">
          <NavItem href="/dex" label="Home" icon={Home} isActive={isActive('/dex')} />
          <NavItem href={me ? '/explore' : '/login'} label="Explore" icon={Compass} isActive={isActive('/explore')} />
          <NavItem href={me ? '/library' : '/login'} label="Library" icon={Library} isActive={isActive('/library')} />
          <NavItem href="/marketplace" label="Market" icon={Store} isActive={isActive('/marketplace')} />

          {/* Create Button - Accent Color */}
          <button
            onClick={handleCreateClick}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all
              ${isMinting
                ? 'bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 animate-pulse text-white'
                : 'bg-cyan-500 hover:bg-cyan-400 text-black'
              }
            `}
          >
            <Plus className="w-4 h-4" />
            <span className="hidden lg:inline">{isMinting ? 'Minting...' : 'Create'}</span>
          </button>

          <NavItem href="/stake" label="Stake" icon={BarChart3} isActive={isActive('/stake')} />
          <NavItem href="/backend" label="Admin" icon={Settings} isActive={isActive('/backend')} />
        </div>

        {/* Right Side - Placeholder for balance/chain (handled in TopNavBar) */}
        <div className="w-32" />
      </div>
    </nav>
  )
}
