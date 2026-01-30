import { useEffect, useState } from 'react'

import { Avatar } from 'components/Avatar'
import { Bell } from 'icons/Bell'
import { Logo } from 'icons/Logo'
import { getJwt } from 'lib/apollo'
import { useMeQuery } from 'lib/graphql'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useMagicContext } from 'hooks/useMagicContext'
import { Users, ChevronDown, Copy, Check, Wallet, ExternalLink } from 'lucide-react'

import { Button } from './common/Buttons/Button'
import { SoundChainPopOver } from './common/PopOverButton/PopOverButton'
import { NavBar } from './NavBar'
import { NotificationBadge } from './NotificationBadge'
import { Notifications } from './Notifications'
import { SocialLinksPanel } from './SocialLinksPanel'
import { Title } from './Title'
import { TopNavBarButton } from './TopNavBarButton'

// Chain data for dropdown
const CHAINS = [
  { id: 137, name: 'Polygon', icon: '🟣', color: 'text-purple-400' },
  { id: 1, name: 'Ethereum', icon: '⟠', color: 'text-blue-400' },
  { id: 8453, name: 'Base', icon: '🔵', color: 'text-blue-500' },
  { id: 42161, name: 'Arbitrum', icon: '🔷', color: 'text-cyan-400' },
  { id: 10, name: 'Optimism', icon: '🔴', color: 'text-red-400' },
]

// Social/Follow Us icon for nav bar - Vibes
const SocialIcon = () => (
  <div className="p-1.5 rounded-full bg-gradient-to-r from-purple-500/20 to-cyan-500/20 hover:from-purple-500/40 hover:to-cyan-500/40 transition-all">
    <Users className="w-5 h-5 text-purple-400" />
  </div>
)

// Enhanced Wallet Button - OpenSea/Rarible style
const WalletButton = () => {
  const { connectWallet, walletConnectedAddress, isConnectingWallet, account, polBalance, ogunBalance } = useMagicContext()
  const [showDropdown, setShowDropdown] = useState(false)
  const [copied, setCopied] = useState(false)
  const [selectedChain, setSelectedChain] = useState(CHAINS[0])

  const displayAddress = walletConnectedAddress || account
  const truncateAddress = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`

  const handleCopy = async () => {
    if (!displayAddress) return
    await navigator.clipboard.writeText(displayAddress)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const formatBalance = (bal: number | string | undefined) => {
    const num = Number(bal) || 0
    if (num < 0.001) return '0'
    if (num < 1) return num.toFixed(4)
    if (num < 1000) return num.toFixed(2)
    return `${(num / 1000).toFixed(1)}K`
  }

  if (!displayAddress) {
    return (
      <button
        onClick={connectWallet}
        disabled={isConnectingWallet}
        className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/15 text-white text-sm font-medium rounded-xl transition-all border border-white/10 hover:border-white/20"
      >
        <Wallet className="w-4 h-4" />
        <span>{isConnectingWallet ? 'Connecting...' : 'Connect'}</span>
      </button>
    )
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="flex items-center gap-3 px-3 py-2 bg-white/5 hover:bg-white/10 rounded-xl transition-all border border-white/10 hover:border-white/20"
      >
        {/* Chain Badge */}
        <div className="flex items-center gap-1.5 pr-2 border-r border-white/10">
          <span className="text-sm">{selectedChain.icon}</span>
        </div>

        {/* Balance */}
        <div className="hidden sm:flex flex-col items-end">
          <span className="text-xs text-white font-medium">{formatBalance(polBalance)} POL</span>
          <span className="text-[10px] text-cyan-400">{formatBalance(ogunBalance)} OGUN</span>
        </div>

        {/* Address */}
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
          <span className="text-xs text-gray-300 font-mono">{truncateAddress(displayAddress)}</span>
          <ChevronDown className={`w-3 h-3 text-gray-400 transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {/* Dropdown Menu - OpenSea style */}
      {showDropdown && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowDropdown(false)} />
          <div className="absolute right-0 top-full mt-2 w-72 bg-gray-900 border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden">
            {/* Balance Section */}
            <div className="p-4 border-b border-white/10">
              <div className="text-xs text-gray-400 mb-2">Balance</div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🟣</span>
                  <span className="text-white font-semibold">{formatBalance(polBalance)} POL</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Logo className="w-5 h-5" />
                  <span className="text-cyan-400 font-semibold">{formatBalance(ogunBalance)} OGUN</span>
                </div>
              </div>
            </div>

            {/* Network Section */}
            <div className="p-4 border-b border-white/10">
              <div className="text-xs text-gray-400 mb-2">Network</div>
              <div className="grid grid-cols-3 gap-2">
                {CHAINS.slice(0, 3).map(chain => (
                  <button
                    key={chain.id}
                    onClick={() => setSelectedChain(chain)}
                    className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-all ${
                      selectedChain.id === chain.id
                        ? 'bg-white/10 border border-white/20'
                        : 'hover:bg-white/5 border border-transparent'
                    }`}
                  >
                    <span className="text-lg">{chain.icon}</span>
                    <span className="text-[10px] text-gray-400">{chain.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Address Section */}
            <div className="p-4 border-b border-white/10">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400 font-mono">{displayAddress}</span>
                <button onClick={handleCopy} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors">
                  {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-gray-400" />}
                </button>
              </div>
            </div>

            {/* Actions */}
            <div className="p-2">
              <Link href="/dex/wallet" passHref onClick={() => setShowDropdown(false)}>
                <div className="flex items-center gap-3 p-3 hover:bg-white/5 rounded-xl transition-all cursor-pointer">
                  <Wallet className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-white">View Wallet</span>
                </div>
              </Link>
              <a
                href={`https://polygonscan.com/address/${displayAddress}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 hover:bg-white/5 rounded-xl transition-all cursor-pointer"
              >
                <ExternalLink className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-white">View on Explorer</span>
              </a>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export interface TopNavBarProps {
  setSideMenuOpen?: (open: boolean) => void
  leftButton?: JSX.Element
  rightButton?: JSX.Element
  title?: string
  subtitle?: JSX.Element
  isLogin?: boolean
}

export const TopNavBar = ({
  title,
  rightButton: RightButton,
  leftButton: LeftButton,
  subtitle: Subtitle,
  setSideMenuOpen,
  isLogin,
}: TopNavBarProps) => {
  const router = useRouter()
  const { data, loading: loadingMe, refetch } = useMeQuery()

  const me = data?.me

  useEffect(() => {
    async function checkLogin() {
      if (!me && !loadingMe && (await getJwt())) {
        await refetch()
      }
    }

    checkLogin()
  }, [me, loadingMe, refetch])

  const onLogin = () => {
    router.push('/login')
  }

  if (isLogin) return null

  const isLoginPage = router.pathname === '/login'
  const isCreateAccount = router.pathname === '/create-account'

  return (
    <header className="sticky top-0 z-50">
      {/* Main Header Bar - Clean & Modern */}
      <div className="relative z-10 flex h-16 items-center justify-between bg-black/95 backdrop-blur-md border-b border-white/5 px-4">
        {/* Mobile Logo */}
        <Link href="/dex" className="flex items-center gap-2 md:hidden" passHref>
          <Logo id="logo_mobile" className="h-8 w-auto" />
        </Link>

        {/* Desktop Navigation */}
        {me ? (
          <div className="hidden md:flex flex-1 items-center">
            <NavBar />
          </div>
        ) : (
          !isLoginPage &&
          !isCreateAccount && (
            <div className="hidden md:flex items-center gap-3">
              <Link href="/" passHref className="flex items-center gap-2">
                <Logo className="h-8 w-auto" />
                <span className="text-white font-semibold text-lg">SoundChain</span>
              </Link>
            </div>
          )
        )}

        {/* Login Button for Non-Logged Users */}
        {!me && !isLoginPage && !isCreateAccount && (
          <button
            onClick={onLogin}
            className="px-5 py-2 bg-cyan-500 hover:bg-cyan-400 text-black font-semibold rounded-xl transition-all text-sm"
          >
            Sign In
          </button>
        )}
        {/* Center Title (optional) */}
        {title && (
          <div className="flex-1 flex justify-center">
            <div className="text-center">
              <Title navTitle className="truncate text-sm text-white font-medium">
                {title}
              </Title>
              {Subtitle}
            </div>
          </div>
        )}

        {/* Right Actions */}
        <div className="flex items-center gap-3">
          {/* Custom Buttons */}
          {(LeftButton || RightButton) && (
            <div className="flex items-center gap-2">
              {LeftButton}
              {RightButton}
            </div>
          )}

          {/* Social Links - Always visible */}
          <SoundChainPopOver icon={SocialIcon}>
            <SocialLinksPanel />
          </SoundChainPopOver>

          {me && (
            <>
              {/* Wallet Button */}
              <WalletButton />

              {/* Notifications */}
              <SoundChainPopOver icon={Bell} badge={NotificationBadge}>
                <Notifications />
              </SoundChainPopOver>

              {/* Profile Avatar */}
              <button
                onClick={() => setSideMenuOpen && setSideMenuOpen(true)}
                className="flex items-center p-1 rounded-full hover:bg-white/10 transition-all"
              >
                <Avatar linkToProfile={false} profile={{ profilePicture: me?.profile.profilePicture }} />
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
