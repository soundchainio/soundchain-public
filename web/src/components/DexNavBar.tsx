/**
 * DexNavBar — the CORRECT global nav header (matches [...slug].tsx style)
 *
 * Frank explicitly wants THIS style on all pages, NOT TopNavBar.
 * TopNavBar had broken icon pills (Neural/Operator events don't fire
 * on custom-layout pages). This nav has: logo, chain data, search,
 * wallet, publish, OGUN price — the working DEX experience.
 *
 * Used by: nodes, explore3d, land, arena, gallery3d, archive
 * The mega-router [...slug].tsx has its own inline version of this.
 */
import Link from 'next/link'
import { useRouter } from 'next/router'
import { Logo } from 'icons/Logo'
import { OgunPriceTicker } from 'components/OgunPriceTicker'
import { useMagicContext } from 'hooks/useMagicContext'
import { useMe } from 'hooks/useMe'
import { useModalDispatch } from 'contexts/ModalContext'
import { Music, Search, ExternalLink, MessageCircle, Bell } from 'lucide-react'
import { useState } from 'react'
import { NotificationBadge } from './NotificationBadge'

export function DexNavBar() {
  const me = useMe()
  const router = useRouter()
  const { account, ogunBalance, connectWallet, isConnectingWallet } = useMagicContext()
  const { dispatchShowCreateModal } = useModalDispatch()
  const [searchQuery, setSearchQuery] = useState('')

  const handleMintClick = () => {
    if (me) dispatchShowCreateModal(true)
    else router.push('/login')
  }

  return (
    <header className="sticky top-0 z-50" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      <nav className="backdrop-blur-xl bg-gray-900/95 border-b border-cyan-500/20 px-2 sm:px-4 lg:px-6 py-1.5 sm:py-2 shadow-lg">
        <div className="flex items-center justify-between max-w-screen-2xl mx-auto">
          {/* Left: Logo + Publish */}
          <div className="flex items-center space-x-2 sm:space-x-4 flex-shrink min-w-0">
            <Link href="/nodes" className="flex items-center space-x-2 sm:space-x-3 flex-shrink-0">
              <Logo className="h-9 w-9 sm:h-12 sm:w-12" />
              <span className="text-xl font-bold bg-gradient-to-r from-orange-400 via-yellow-400 to-cyan-400 bg-clip-text text-transparent hidden lg:block">
                SoundChain
              </span>
            </Link>

            {/* Publish button */}
            <button
              onClick={handleMintClick}
              className="flex items-center gap-1 px-2 sm:px-3 py-1.5 rounded-lg text-sm font-medium bg-purple-500/10 border border-purple-500/20 hover:bg-purple-500/20 transition text-purple-400"
            >
              <Music className="w-4 h-4" />
              <span className="hidden sm:inline">Publish+</span>
            </button>
          </div>

          {/* Center: Search (desktop) */}
          <div className="hidden lg:block flex-1 max-w-md mx-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="search"
                placeholder="Search tracks, users..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && searchQuery.length >= 1) {
                    router.push(`/explore?q=${encodeURIComponent(searchQuery)}`)
                  }
                }}
                className="w-full bg-black/40 border border-cyan-500/20 rounded-full px-4 py-2 pl-10 text-sm focus:outline-none focus:border-cyan-500/50 transition-colors text-white placeholder-gray-500"
              />
            </div>
          </div>

          {/* Right: Chain data + Wallet + Pulse + Notifications */}
          <div className="flex items-center gap-1 sm:gap-2 lg:gap-3 flex-shrink-0">
            {/* Chain data links (desktop) */}
            <div className="hidden xl:flex items-center gap-2 text-[10px] font-mono text-gray-500">
              <a href="https://www.dappradar.com/dapp/soundchain" target="_blank" rel="noreferrer" className="hover:text-cyan-400 transition flex items-center gap-0.5">
                DappRadar <ExternalLink className="w-2.5 h-2.5" />
              </a>
              <a href="https://www.top100token.com/address/0x45f1af89486aeec2da0b06340cd9cd3bd741a15c" target="_blank" rel="noreferrer" className="hover:text-cyan-400 transition flex items-center gap-0.5">
                Top100Token <ExternalLink className="w-2.5 h-2.5" />
              </a>
            </div>

            {/* OGUN Price Ticker */}
            <OgunPriceTicker />

            {/* Wallet */}
            {account ? (
              <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-green-500/10 border border-green-500/20 text-[10px] font-mono">
                <span className="text-green-400">{ogunBalance ? `${Number(ogunBalance).toFixed(2)} OGUN` : '...'}</span>
                <span className="text-gray-500 hidden sm:inline">· {account.slice(0, 6)}...{account.slice(-4)}</span>
              </div>
            ) : (
              <button
                onClick={() => connectWallet?.()}
                disabled={isConnectingWallet}
                className="px-3 py-1.5 rounded-lg text-[10px] font-mono font-bold bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/30 transition"
              >
                {isConnectingWallet ? 'CONNECTING...' : 'CONNECT'}
              </button>
            )}

            {/* Pulse */}
            {me && (
              <Link href="/pulse">
                <button className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-full bg-[#00a884]/10 hover:bg-[#00a884]/20 border border-[#00a884]/30 transition-all relative">
                  <MessageCircle className="w-4 h-4 text-[#00a884]" />
                  <span className="text-xs font-semibold text-[#00a884] hidden sm:inline">Pulse</span>
                </button>
              </Link>
            )}

            {/* Notifications Bell */}
            {me && (
              <Link href="/notifications">
                <button className="relative p-1.5 rounded-full hover:bg-white/10 transition">
                  <Bell className="w-4 h-4 text-gray-400" />
                  <NotificationBadge />
                </button>
              </Link>
            )}

            {/* Login for non-auth */}
            {!me && (
              <Link href="/login">
                <button className="px-4 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-black font-semibold rounded-lg transition text-sm">
                  Sign In
                </button>
              </Link>
            )}
          </div>
        </div>
      </nav>
    </header>
  )
}
