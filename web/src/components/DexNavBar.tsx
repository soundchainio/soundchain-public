/**
 * DexNavBar — the global top header nav bar mounted on every page (except /login).
 *
 * Pills behave identically to the profile mega-router's inline nav
 * (pages/dex/[...slug].tsx:3180-4281). Phased port — this file picks up
 * one accordion at a time so each ship is bisect-friendly.
 *
 * Phase A1 (LANDED): PiggyBank → WIN-WIN accordion modal with Catalog/Listener
 *                    tabs, backed by scidsByProfile + myListenerRewards queries.
 * Phase A2 (next):   Nearby → Bitchat dropdown (ConcertChat embed).
 * Phase A3 (next):   Vibes → social links dropdown.
 * Phase A4 (next):   Bell → notifications popover; Avatar → user menu.
 * Phase B (next):    delete the ~1,100 lines of inline nav in [...slug].tsx.
 *
 * Used by: Layout.tsx + direct mounts on nodes, explore3d, land, arena,
 * gallery3d, archive, radio.
 */
import { gql, useQuery } from '@apollo/client'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Music, Search, ExternalLink, MessageCircle, Bell, Radio, Sparkles,
  PiggyBank, Coins, Headphones, Wallet, Zap, X,
} from 'lucide-react'
import { Logo } from 'icons/Logo'
import { useMagicContext } from 'hooks/useMagicContext'
import { useMe } from 'hooks/useMe'
import { useModalDispatch } from 'contexts/ModalContext'
import { NotificationBadge } from './NotificationBadge'
import { Avatar } from './Avatar'

const PROFILE_STREAMING_REWARDS_QUERY = gql`
  query ProfileStreamingRewards($profileId: String!) {
    scidsByProfile(profileId: $profileId) {
      id
      scid
      streamCount
      ogunRewardsEarned
      ogunRewardsClaimed
    }
  }
`

const MY_LISTENER_REWARDS_QUERY = gql`
  query MyListenerRewards {
    myListenerRewards {
      dailyEarned
      totalEarned
      dailyLimit
      tracksStreamedToday
    }
  }
`

export function DexNavBar() {
  const me = useMe()
  const router = useRouter()
  const { account, ogunBalance, connectWallet, isConnectingWallet } = useMagicContext()
  const { dispatchShowCreateModal } = useModalDispatch()
  const [searchQuery, setSearchQuery] = useState('')

  // WIN-WIN accordion state
  const [showWinWin, setShowWinWin] = useState(false)
  const [winWinTab, setWinWinTab] = useState<'catalog' | 'listener'>('catalog')
  const winWinRef = useRef<HTMLDivElement | null>(null)

  // Rewards queries — gated on auth so anonymous users never fire them
  const { data: streamingData, loading: streamingLoading } = useQuery(PROFILE_STREAMING_REWARDS_QUERY, {
    variables: { profileId: me?.profile?.id || '' },
    skip: !me?.profile?.id,
    fetchPolicy: 'cache-first',
  })
  const { data: listenerData, loading: listenerLoading } = useQuery(MY_LISTENER_REWARDS_QUERY, {
    skip: !me,
    fetchPolicy: 'cache-and-network',
  })

  const totalOgunEarned = useMemo(() => {
    const scids = streamingData?.scidsByProfile
    if (!scids) return 0
    return scids.reduce((t: number, s: any) => t + (s.ogunRewardsEarned || 0), 0)
  }, [streamingData])

  const totalStreams = useMemo(() => {
    const scids = streamingData?.scidsByProfile
    if (!scids) return 0
    return scids.reduce((t: number, s: any) => t + (s.streamCount || 0), 0)
  }, [streamingData])

  const totalUnclaimed = useMemo(() => {
    const scids = streamingData?.scidsByProfile
    if (!scids) return 0
    return scids.reduce((t: number, s: any) => {
      const earned = s.ogunRewardsEarned || 0
      const claimed = s.ogunRewardsClaimed || 0
      return t + Math.max(0, earned - claimed)
    }, 0)
  }, [streamingData])

  // Click outside to close accordion
  useEffect(() => {
    if (!showWinWin) return
    const onDown = (e: MouseEvent) => {
      if (winWinRef.current && !winWinRef.current.contains(e.target as Node)) setShowWinWin(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [showWinWin])

  const handleMintClick = () => {
    if (me) dispatchShowCreateModal(true)
    else router.push('/login')
  }

  const trackCount = streamingData?.scidsByProfile?.length || 0
  const listenerTotal = listenerData?.myListenerRewards?.totalEarned || 0
  const listenerToday = listenerData?.myListenerRewards?.tracksStreamedToday || 0
  const listenerDaily = listenerData?.myListenerRewards?.dailyEarned || 0
  const listenerDailyLimit = listenerData?.myListenerRewards?.dailyLimit || 50

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

          {/* Right: action pills */}
          <div className="flex items-center gap-1 sm:gap-2 lg:gap-3 flex-shrink-0">
            <div className="hidden xl:flex items-center gap-2 text-[10px] font-mono text-gray-500">
              <a href="https://www.dappradar.com/dapp/soundchain" target="_blank" rel="noreferrer" className="hover:text-cyan-400 transition flex items-center gap-0.5">
                DappRadar <ExternalLink className="w-2.5 h-2.5" />
              </a>
              <a href="https://www.top100token.com/address/0x45f1af89486aeec2da0b06340cd9cd3bd741a15c" target="_blank" rel="noreferrer" className="hover:text-cyan-400 transition flex items-center gap-0.5">
                Top100Token <ExternalLink className="w-2.5 h-2.5" />
              </a>
            </div>

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

            {/* Nearby (Bitchat) — Phase A2 will swap to accordion modal */}
            <Link href="/nearby" className="flex-shrink-0" title="Nearby — Bitchat">
              <button className="p-1.5 rounded-full bg-green-500/10 hover:bg-green-500/20 border border-green-500/30 transition">
                <Radio className="w-4 h-4 text-green-400" />
              </button>
            </Link>

            {/* PiggyBank — WIN-WIN Rewards accordion (Phase A1) */}
            <div className="relative flex-shrink-0" ref={winWinRef}>
              <button
                onClick={() => setShowWinWin(v => !v)}
                className="p-1.5 rounded-full bg-pink-500/10 hover:bg-pink-500/20 border border-pink-500/30 transition"
                title="WIN-WIN Streaming Rewards"
              >
                <PiggyBank className="w-4 h-4 text-pink-400" />
              </button>

              {showWinWin && (
                <div
                  className="fixed sm:absolute left-1/2 sm:left-auto sm:right-0 top-14 sm:top-12 -translate-x-1/2 sm:translate-x-0 w-[calc(100vw-2rem)] sm:w-80 max-w-[20rem] z-[99] shadow-2xl max-h-[80vh] overflow-hidden border-2 border-orange-500/50 bg-gradient-to-b from-neutral-900 via-orange-950/10 to-neutral-900 rounded-lg"
                  onClick={e => e.stopPropagation()}
                >
                  {/* Header */}
                  <div className="flex items-center justify-between p-3 border-b border-orange-500/30 bg-gradient-to-r from-orange-900/50 to-yellow-900/50">
                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-yellow-500 flex items-center justify-center">
                          <PiggyBank className="w-5 h-5 text-white" />
                        </div>
                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-cyan-400 rounded-full flex items-center justify-center animate-pulse">
                          <Coins className="w-2 h-2 text-cyan-900" />
                        </div>
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-yellow-400">WIN-WIN Rewards</h3>
                        <p className="text-[10px] text-cyan-400/80">Stream to Earn OGUN</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowWinWin(false)}
                      className="w-6 h-6 flex items-center justify-center rounded hover:bg-orange-500/20"
                      aria-label="Close"
                    >
                      <X className="w-4 h-4 text-orange-400" />
                    </button>
                  </div>

                  {/* Tabs */}
                  {me && (
                    <div className="flex border-b border-orange-500/20">
                      <button
                        onClick={() => setWinWinTab('catalog')}
                        className={`flex-1 py-2 px-3 text-xs font-bold flex items-center justify-center gap-1 transition-all ${
                          winWinTab === 'catalog'
                            ? 'bg-orange-500/20 text-orange-400 border-b-2 border-orange-500'
                            : 'text-gray-400 hover:text-orange-300 hover:bg-orange-500/10'
                        }`}
                      >
                        <Music className="w-3 h-3" />
                        Catalog
                      </button>
                      <button
                        onClick={() => setWinWinTab('listener')}
                        className={`flex-1 py-2 px-3 text-xs font-bold flex items-center justify-center gap-1 transition-all ${
                          winWinTab === 'listener'
                            ? 'bg-cyan-500/20 text-cyan-400 border-b-2 border-cyan-500'
                            : 'text-gray-400 hover:text-cyan-300 hover:bg-cyan-500/10'
                        }`}
                      >
                        <Headphones className="w-3 h-3" />
                        Listener
                      </button>
                    </div>
                  )}

                  {/* Catalog Tab */}
                  {me && winWinTab === 'catalog' && (
                    <div className="p-3 border-b border-orange-500/20">
                      <div className="text-[10px] text-orange-400/80 uppercase tracking-wider mb-2 text-center">
                        Your Catalog Earnings (70% Creator Share)
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="text-center p-2 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
                          <div className="text-[9px] text-yellow-500/70 uppercase">Catalog</div>
                          <div className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-400">
                            {streamingLoading ? '...' : totalOgunEarned.toFixed(2)}
                          </div>
                          <div className="text-[9px] text-yellow-500/70">OGUN</div>
                        </div>
                        <div className="text-center p-2 bg-cyan-500/10 rounded-lg border border-cyan-500/20">
                          <div className="text-[9px] text-cyan-500/70 uppercase">Streams</div>
                          <div className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400">
                            {streamingLoading ? '...' : totalStreams.toLocaleString()}
                          </div>
                          <div className="text-[9px] text-cyan-500/70">plays</div>
                        </div>
                        <div className="text-center p-2 bg-orange-500/10 rounded-lg border border-orange-500/20">
                          <div className="text-[9px] text-orange-500/70 uppercase">Tracks</div>
                          <div className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-red-400">
                            {streamingLoading ? '...' : trackCount}
                          </div>
                          <div className="text-[9px] text-orange-500/70">active</div>
                        </div>
                      </div>
                      <p className="text-[9px] text-gray-500 text-center mt-2">
                        Earned when others stream YOUR tracks
                      </p>
                    </div>
                  )}

                  {/* Listener Tab */}
                  {me && winWinTab === 'listener' && (
                    <div className="p-3 border-b border-cyan-500/20">
                      <div className="text-[10px] text-cyan-400/80 uppercase tracking-wider mb-2 text-center">
                        Your Listener Earnings (30% Listener Share)
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="text-center p-2 bg-cyan-500/10 rounded-lg border border-cyan-500/20">
                          <div className="text-[9px] text-cyan-500/70 uppercase">Earned</div>
                          <div className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400">
                            {listenerLoading ? '...' : listenerTotal.toFixed(2)}
                          </div>
                          <div className="text-[9px] text-cyan-500/70">OGUN</div>
                        </div>
                        <div className="text-center p-2 bg-purple-500/10 rounded-lg border border-purple-500/20">
                          <div className="text-[9px] text-purple-500/70 uppercase">Streamed</div>
                          <div className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
                            {listenerLoading ? '...' : listenerToday}
                          </div>
                          <div className="text-[9px] text-purple-500/70">Today</div>
                        </div>
                        <div className="text-center p-2 bg-green-500/10 rounded-lg border border-green-500/20">
                          <div className="text-[9px] text-green-500/70 uppercase">Today</div>
                          <div className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-400">
                            {listenerLoading ? '...' : listenerDaily.toFixed(2)}
                          </div>
                          <div className="text-[9px] text-green-500/70">OGUN</div>
                        </div>
                      </div>
                      <div className="mt-2 p-2 bg-cyan-500/5 rounded-lg border border-cyan-500/20">
                        <p className="text-[9px] text-cyan-400 text-center">🎧 WIN-WIN! Earn 30% when YOU stream tracks</p>
                        <p className="text-[8px] text-gray-500 text-center mt-1">
                          Stream tracks for 30+ sec → Earn 0.15 OGUN each (max {listenerDailyLimit} OGUN/day)
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Universal rate */}
                  <div className="p-3 border-b border-orange-500/20">
                    <div className="text-center p-2 bg-gradient-to-br from-green-500/10 to-cyan-500/10 rounded-lg border border-green-500/30">
                      <div className="text-[10px] text-green-400/80">All Tracks Earn Equal Rewards</div>
                      <div className="text-base font-bold text-green-400">0.5 OGUN</div>
                      <div className="text-[9px] text-gray-400">per stream (70% creator / 30% listener)</div>
                    </div>
                  </div>

                  {/* Unclaimed */}
                  {totalUnclaimed > 0 && (
                    <div className="px-3 pt-2 text-center">
                      <p className="text-xs text-yellow-400 font-semibold">
                        {totalUnclaimed.toFixed(2)} OGUN unclaimed
                      </p>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="p-3 grid grid-cols-2 gap-2">
                    <button
                      onClick={() => { setShowWinWin(false); router.push('/staking') }}
                      disabled={totalUnclaimed <= 0}
                      className={`py-2 font-bold rounded-lg text-sm flex items-center justify-center gap-1 transition-all ${
                        totalUnclaimed > 0
                          ? 'bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-black'
                          : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                      }`}
                    >
                      <Wallet className="w-3 h-3" /> Claim
                    </button>
                    <button
                      onClick={() => { setShowWinWin(false); router.push('/staking') }}
                      disabled={totalUnclaimed <= 0}
                      className={`py-2 font-bold rounded-lg text-sm flex items-center justify-center gap-1 transition-all ${
                        totalUnclaimed > 0
                          ? 'bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white'
                          : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                      }`}
                    >
                      <Zap className="w-3 h-3" /> Stake
                    </button>
                  </div>

                  <div className="px-3 pb-2 text-center">
                    <p className="text-[9px] text-gray-500">
                      {totalUnclaimed <= 0 ? 'Stream tracks to earn OGUN · ' : ''}Creator 70% · Listener 30% · 30sec min · Polygon
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Moltbook */}
            <Link href="/backend" className="flex-shrink-0" title="Moltbook — Agent Playground">
              <button className="p-1.5 rounded-full bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 transition w-7 h-7 flex items-center justify-center">
                <span className="text-sm leading-none">🦞</span>
              </button>
            </Link>

            {/* Vibes — Phase A3 will swap to accordion modal */}
            <Link href="/dex/users" className="flex-shrink-0" title="Vibes — Social">
              <button className="p-1.5 rounded-full bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 transition">
                <Sparkles className="w-4 h-4 text-purple-400" />
              </button>
            </Link>

            {me && (
              <Link href="/pulse" className="flex-shrink-0">
                <button className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-full bg-[#00a884]/10 hover:bg-[#00a884]/20 border border-[#00a884]/30 transition-all relative">
                  <MessageCircle className="w-4 h-4 text-[#00a884]" />
                  <span className="text-xs font-semibold text-[#00a884] hidden sm:inline">Pulse</span>
                </button>
              </Link>
            )}

            {me && (
              <Link href="/notifications" className="flex-shrink-0">
                <button className="relative p-1.5 rounded-full hover:bg-white/10 transition">
                  <Bell className="w-4 h-4 text-gray-400" />
                  <NotificationBadge />
                </button>
              </Link>
            )}

            {me?.profile?.userHandle && (
              <Link
                href={`/profiles/${me.profile.userHandle}`}
                className="flex-shrink-0 p-0.5 rounded-full hover:bg-white/10 transition"
                aria-label="Profile"
              >
                <Avatar linkToProfile={false} profile={{ profilePicture: me.profile.profilePicture }} pixels={28} />
              </Link>
            )}

            {!me && (
              <Link href="/login" className="flex-shrink-0">
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
