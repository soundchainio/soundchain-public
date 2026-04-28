/**
 * DexNavBar — the global top header nav bar mounted on every page (except /login).
 *
 * Pills behave identically to the profile mega-router's inline nav
 * (pages/dex/[...slug].tsx:3180-4281). Phased port — each ship is bisect-friendly.
 *
 * Phase A1 (LANDED): PiggyBank → WIN-WIN accordion (Catalog/Listener tabs).
 * Phase A2 (LANDED): Nearby → Bitchat accordion (ConcertChat embed).
 * Phase A3 (LANDED): Vibes → social links accordion.
 * Phase A4 (LANDED): Bell → notifications popover (anon users still route).
 * Phase A5 (deferred): Avatar → full user menu (verification + account settings
 *                      accordions; state-coupled to mega-router, keep simple
 *                      link for now).
 * Phase B (deferred): delete the ~1,100 lines of inline nav in [...slug].tsx.
 * Phase C (deferred): FURL AgentStatusTicker → persistent collapsible dock
 *                     in _app.tsx (4,367-line ticker needs its own session).
 *
 * Used by: Layout.tsx + direct mounts on nodes, explore3d, land, arena,
 * gallery3d, archive, radio.
 */
import { gql, useQuery } from '@apollo/client'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Music, Search, ExternalLink, MessageCircle, Bell, Radio, Sparkles,
  PiggyBank, Coins, Headphones, Wallet, Zap, X, Users,
  ShieldCheck, Settings as SettingsIcon, AtSign, ChevronUp, ChevronDown,
  Check, Copy, AlertCircle, LogOut, User as UserIcon,
  Moon, Sun, Monitor,
} from 'lucide-react'
import { useTheme, ThemeChoice } from 'lib/theme/ThemeContext'
import { Logo } from 'icons/Logo'
import { useMagicContext } from 'hooks/useMagicContext'
import { useMe } from 'hooks/useMe'
import { useUnifiedWallet } from 'contexts/UnifiedWalletContext'
import { useModalDispatch } from 'contexts/ModalContext'
import {
  ProfileVerificationStatusType,
  useCreateProfileVerificationRequestMutation,
  useProfileVerificationRequestQuery,
  useUpdateHandleMutation,
  useUpdateProfileDisplayNameMutation,
} from 'lib/graphql'
import { setJwt } from 'lib/apollo'
import { config } from 'config'
import { NotificationBadge } from './NotificationBadge'
import { Avatar } from './Avatar'

// Dynamic imports — both depend on browser-only APIs (geolocation / apollo cache)
const ConcertChat = dynamic(() => import('components/dex/ConcertChat').then(m => m.ConcertChat), { ssr: false })
const Notifications = dynamic(() => import('components/Notifications').then(m => m.Notifications), { ssr: false })

// FURL AgentStatusTicker — 4,367 lines of xterm + tunnel + wallet telemetry.
// Mounted inside DexNavBar so every page that renders the nav also gets the ticker
// without per-page wiring. Single-source-of-truth: future ticker placement changes
// happen in one file. ssr:false because it depends on window/localStorage/SpeechRecognition.
const AgentStatusTicker = dynamic(
  () => import('components/AgentStatusTicker').then(m => m.AgentStatusTicker),
  { ssr: false },
)
import { OgunPriceTicker } from 'components/OgunPriceTicker'
import { SportsTickerStack } from 'components/SportsTickerStack'

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

type OpenPanel = 'none' | 'nearby' | 'winwin' | 'vibes' | 'bell' | 'avatar'

export function DexNavBar() {
  const me = useMe()
  const router = useRouter()
  const { account: magicAccount, ogunBalance: magicOgunBalance, connectWallet, isConnectingWallet } = useMagicContext()
  const { activeAddress, ogunBalance: unifiedOgunBalance, connectWeb3Modal, isWeb3ModalReady } = useUnifiedWallet()
  // Canonical address — external wallet wins over Magic, so a public visitor's MM/WC/Coinbase
  // connection lights up the pill the same way it does on /wallet + /shop.
  const account = activeAddress || magicAccount
  const ogunBalance = unifiedOgunBalance || magicOgunBalance
  const { dispatchShowCreateModal } = useModalDispatch()
  const [searchQuery, setSearchQuery] = useState('')

  // Single source of truth — only one panel can be open at a time.
  const [openPanel, setOpenPanel] = useState<OpenPanel>('none')
  const [tickerCollapsed, setTickerCollapsed] = useState(false)
  const [winWinTab, setWinWinTab] = useState<'catalog' | 'listener'>('catalog')
  const panelRef = useRef<HTMLDivElement | null>(null)
  const popoverRef = useRef<HTMLDivElement | null>(null)

  const toggle = (panel: OpenPanel) => setOpenPanel(prev => (prev === panel ? 'none' : panel))
  const close = () => setOpenPanel('none')

  // Avatar user-menu state (mirrors mega-router at pages/dex/[...slug].tsx:1082-1097)
  const [showVerification, setShowVerification] = useState(false)
  const [verifySoundcloud, setVerifySoundcloud] = useState('')
  const [verifyYoutube, setVerifyYoutube] = useState('')
  const [verifyBandcamp, setVerifyBandcamp] = useState('')
  const [verifyLoading, setVerifyLoading] = useState(false)
  const [verifySuccess, setVerifySuccess] = useState(false)
  const [verifyError, setVerifyError] = useState<string | null>(null)

  const [showAccountSettings, setShowAccountSettings] = useState(false)
  const [editDisplayName, setEditDisplayName] = useState('')
  const [editHandle, setEditHandle] = useState('')
  const [accountSettingsSaving, setAccountSettingsSaving] = useState(false)
  const [accountSettingsSuccess, setAccountSettingsSuccess] = useState<string | null>(null)
  const [nostrPubkeyCopied, setNostrPubkeyCopied] = useState(false)
  const { choice: themeChoice, setTheme } = useTheme()

  const [updateDisplayName] = useUpdateProfileDisplayNameMutation()
  const [updateHandle] = useUpdateHandleMutation()
  const [createVerificationRequest] = useCreateProfileVerificationRequestMutation()
  const { data: verificationData } = useProfileVerificationRequestQuery({ skip: !me })
  const existingRequest = verificationData?.profileVerificationRequest

  // Seed edit fields once we have a profile
  useEffect(() => {
    if (me?.profile) {
      setEditDisplayName(prev => prev || me.profile?.displayName || '')
      setEditHandle(prev => prev || me.profile?.userHandle || '')
    }
  }, [me?.profile?.id])

  const handleVerificationSubmit = async () => {
    if (!verifySoundcloud && !verifyYoutube && !verifyBandcamp) {
      setVerifyError('Please provide at least one link')
      return
    }
    setVerifyLoading(true)
    setVerifyError(null)
    try {
      await createVerificationRequest({
        variables: {
          input: {
            soundcloud: verifySoundcloud || undefined,
            youtube: verifyYoutube || undefined,
            bandcamp: verifyBandcamp || undefined,
          },
        },
      })
      setVerifySuccess(true)
      setVerifySoundcloud('')
      setVerifyYoutube('')
      setVerifyBandcamp('')
    } catch (err: any) {
      setVerifyError(err?.message || 'Failed to submit request')
    } finally {
      setVerifyLoading(false)
    }
  }

  const handleSaveDisplayName = async () => {
    if (!editDisplayName.trim()) return
    setAccountSettingsSaving(true)
    setAccountSettingsSuccess(null)
    try {
      await updateDisplayName({
        variables: { input: { displayName: editDisplayName.trim() } },
        refetchQueries: ['Me'],
      })
      setAccountSettingsSuccess('Display name saved!')
      setTimeout(() => setAccountSettingsSuccess(null), 2000)
    } catch (error) {
      console.error('Failed to update display name:', error)
    }
    setAccountSettingsSaving(false)
  }

  const handleSaveHandle = async () => {
    if (!editHandle.trim()) return
    setAccountSettingsSaving(true)
    setAccountSettingsSuccess(null)
    try {
      await updateHandle({
        variables: { input: { handle: editHandle.trim() } },
        refetchQueries: ['Me'],
      })
      setAccountSettingsSuccess('Username saved!')
      setTimeout(() => setAccountSettingsSuccess(null), 2000)
    } catch (error) {
      console.error('Failed to update handle:', error)
    }
    setAccountSettingsSaving(false)
  }

  const onLogout = async () => {
    try {
      localStorage.removeItem('didToken')
      localStorage.removeItem('jwt_fallback')
      localStorage.removeItem('connectedWalletAddress')
      localStorage.removeItem('connectedWalletType')
      await setJwt()
      window.location.href = '/login'
    } catch (error) {
      console.error('Logout error:', error)
      window.location.href = '/login'
    }
  }

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

  // Click-outside to close whatever's open
  useEffect(() => {
    if (openPanel === 'none') return
    const onDown = (e: MouseEvent) => {
      const target = e.target as Node
      // Don't close if click is inside the pill bar OR inside any open popover
      if (panelRef.current?.contains(target)) return
      if (popoverRef.current?.contains(target)) return
      // Also check by class — all popovers have z-[99]
      const el = target as HTMLElement
      if (el.closest?.('[data-popover]')) return
      close()
    }
    // Use 'click' not 'mousedown' — mousedown fires BEFORE Link click handlers,
    // which unmounts the popover and cancels navigation. Bug killed avatar menu.
    document.addEventListener('click', onDown)
    // Close on route change (Link navigation completes → panel closes)
    const onRoute = () => close()
    router.events.on('routeChangeStart', onRoute)
    return () => {
      document.removeEventListener('click', onDown)
      router.events.off('routeChangeStart', onRoute)
    }
  }, [openPanel])

  const handleMintClick = () => {
    if (me) dispatchShowCreateModal(true)
    else router.push('/login')
  }

  const trackCount = streamingData?.scidsByProfile?.length || 0
  const listenerTotal = listenerData?.myListenerRewards?.totalEarned || 0
  const listenerToday = listenerData?.myListenerRewards?.tracksStreamedToday || 0
  const listenerDaily = listenerData?.myListenerRewards?.dailyEarned || 0
  const listenerDailyLimit = listenerData?.myListenerRewards?.dailyLimit || 50

  // Shared popover wrapper classes — fixed-centered on mobile, absolute-right on desktop.
  const popoverBase = 'fixed left-1/2 sm:left-auto sm:right-4 top-14 sm:top-12 -translate-x-1/2 sm:translate-x-0 z-[9999] shadow-2xl overflow-hidden rounded-lg'

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

          {/* Right: action pills — shared panelRef for click-outside */}
          <div className="flex items-center gap-1 sm:gap-2 lg:gap-3 flex-shrink-0" ref={panelRef}>
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
                onClick={() => (isWeb3ModalReady ? connectWeb3Modal() : connectWallet?.())}
                disabled={isConnectingWallet}
                className="px-3 py-1.5 rounded-lg text-[10px] font-mono font-bold bg-gradient-to-r from-cyan-500/20 to-purple-500/20 border border-cyan-500/40 text-cyan-300 hover:from-cyan-500/30 hover:to-purple-500/30 hover:border-cyan-400/60 transition shadow-[0_0_12px_rgba(6,182,212,0.25)]"
                title="Connect wallet — MetaMask, WalletConnect, Coinbase + 600 more (no account needed)"
              >
                {isConnectingWallet ? 'CONNECTING...' : 'CONNECT WALLET'}
              </button>
            )}

            {/* Nearby (Bitchat) — accordion modal */}
            <div className="relative flex-shrink-0">
              <button
                onClick={() => toggle('nearby')}
                className="p-1.5 rounded-full bg-green-500/10 hover:bg-green-500/20 border border-green-500/30 transition"
                title="Nearby — Bitchat"
              >
                <Radio className="w-4 h-4 text-green-400" />
              </button>
              {openPanel === 'nearby' && (
                <div
                  className={`${popoverBase} w-[calc(100vw-2rem)] sm:w-96 max-w-[24rem] max-h-[80vh] border-2 border-green-500/50 bg-neutral-900`}
                  data-popover onClick={e => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between p-3 border-b border-green-500/30 bg-green-950">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-500 to-cyan-500 flex items-center justify-center">
                        <Radio className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-cyan-400">Nearby</h3>
                        <p className="text-[10px] text-green-300/80">Chat via Bitchat</p>
                      </div>
                    </div>
                    <button onClick={close} className="w-6 h-6 flex items-center justify-center rounded hover:bg-green-500/20" aria-label="Close">
                      <X className="w-4 h-4 text-green-400" />
                    </button>
                  </div>
                  <div className="max-h-[60vh] overflow-y-auto">
                    <ConcertChat showBitchatPromo={true} compact={true} />
                  </div>
                </div>
              )}
            </div>

            {/* PiggyBank — WIN-WIN Rewards accordion */}
            <div className="relative flex-shrink-0">
              <button
                onClick={() => toggle('winwin')}
                className="p-1.5 rounded-full bg-pink-500/10 hover:bg-pink-500/20 border border-pink-500/30 transition"
                title="WIN-WIN Streaming Rewards"
              >
                <PiggyBank className="w-4 h-4 text-pink-400" />
              </button>

              {openPanel === 'winwin' && (
                <div
                  className={`${popoverBase} w-[calc(100vw-2rem)] sm:w-80 max-w-[20rem] max-h-[80vh] border-2 border-orange-500/50 bg-neutral-900`}
                  data-popover onClick={e => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between p-3 border-b border-orange-500/30 bg-orange-950">
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
                    <button onClick={close} className="w-6 h-6 flex items-center justify-center rounded hover:bg-orange-500/20" aria-label="Close">
                      <X className="w-4 h-4 text-orange-400" />
                    </button>
                  </div>

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

                  <div className="p-3 border-b border-orange-500/20">
                    <div className="text-center p-2 bg-gradient-to-br from-green-500/10 to-cyan-500/10 rounded-lg border border-green-500/30">
                      <div className="text-[10px] text-green-400/80">All Tracks Earn Equal Rewards</div>
                      <div className="text-base font-bold text-green-400">0.5 OGUN</div>
                      <div className="text-[9px] text-gray-400">per stream (70% creator / 30% listener)</div>
                    </div>
                  </div>

                  {totalUnclaimed > 0 && (
                    <div className="px-3 pt-2 text-center">
                      <p className="text-xs text-yellow-400 font-semibold">
                        {totalUnclaimed.toFixed(2)} OGUN unclaimed
                      </p>
                    </div>
                  )}

                  <div className="p-3 grid grid-cols-2 gap-2">
                    <button
                      onClick={() => { close(); router.push('/staking') }}
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
                      onClick={() => { close(); router.push('/staking') }}
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

            {/* Vibes — social links accordion */}
            <div className="relative flex-shrink-0">
              <button
                onClick={() => toggle('vibes')}
                className="p-1.5 rounded-full bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 transition"
                title="Vibes — Social Links"
              >
                <Sparkles className="w-4 h-4 text-purple-400" />
              </button>

              {openPanel === 'vibes' && (
                <div
                  className={`${popoverBase} w-[calc(100vw-2rem)] sm:w-72 max-w-[18rem] border-2 border-purple-500/50 bg-neutral-900`}
                  data-popover onClick={e => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between p-3 border-b border-purple-500/30 bg-purple-950">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center">
                        <Users className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400">Vibes</h3>
                        <p className="text-[10px] text-purple-300/80">Connect with SoundChain</p>
                      </div>
                    </div>
                    <button onClick={close} className="w-6 h-6 flex items-center justify-center rounded hover:bg-purple-500/20" aria-label="Close">
                      <X className="w-4 h-4 text-purple-400" />
                    </button>
                  </div>

                  <div className="p-3 space-y-2">
                    <a href="https://twitter.com/soundchain_io" target="_blank" rel="noreferrer" className="flex items-center gap-3 p-2 rounded-lg bg-blue-500/10 border border-blue-500/20 hover:bg-blue-500/20 transition-all">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center">
                        <span className="text-white text-sm">𝕏</span>
                      </div>
                      <div>
                        <div className="font-semibold text-white text-xs">Twitter / X</div>
                        <div className="text-[10px] text-blue-400">@soundchain_io</div>
                      </div>
                    </a>
                    <a href="https://discord.gg/5yZG6BTTHV" target="_blank" rel="noreferrer" className="flex items-center gap-3 p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20 hover:bg-indigo-500/20 transition-all">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-400 to-indigo-600 flex items-center justify-center">
                        <span className="text-white text-sm">🎮</span>
                      </div>
                      <div>
                        <div className="font-semibold text-white text-xs">Discord</div>
                        <div className="text-[10px] text-indigo-400">Join Community</div>
                      </div>
                    </a>
                    <a href="https://t.me/+DbHfqlVpV644ZGMx" target="_blank" rel="noreferrer" className="flex items-center gap-3 p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20 hover:bg-cyan-500/20 transition-all">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-400 to-cyan-600 flex items-center justify-center">
                        <span className="text-white text-sm">✈️</span>
                      </div>
                      <div>
                        <div className="font-semibold text-white text-xs">Telegram</div>
                        <div className="text-[10px] text-cyan-400">Join Chat</div>
                      </div>
                    </a>
                    <a href="https://instagram.com/soundchain.io" target="_blank" rel="noreferrer" className="flex items-center gap-3 p-2 rounded-lg bg-pink-500/10 border border-pink-500/20 hover:bg-pink-500/20 transition-all">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-pink-400 via-purple-500 to-orange-400 flex items-center justify-center">
                        <span className="text-white text-sm">📷</span>
                      </div>
                      <div>
                        <div className="font-semibold text-white text-xs">Instagram</div>
                        <div className="text-[10px] text-pink-400">@soundchain.io</div>
                      </div>
                    </a>
                    <a href="https://youtube.com/channel/UC-TJ1KIYWCYLtngwaELgyLQ" target="_blank" rel="noreferrer" className="flex items-center gap-3 p-2 rounded-lg bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 transition-all">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center">
                        <span className="text-white text-sm">▶️</span>
                      </div>
                      <div>
                        <div className="font-semibold text-white text-xs">YouTube</div>
                        <div className="text-[10px] text-red-400">SoundChain</div>
                      </div>
                    </a>
                  </div>

                  <div className="px-3 pb-2 text-center border-t border-purple-500/20 pt-2">
                    <p className="text-[9px] text-gray-500">SOUNDCHAIN · THE FUTURE OF MUSIC</p>
                  </div>
                </div>
              )}
            </div>

            {me && (
              <Link href="/pulse" className="flex-shrink-0">
                <button className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-full bg-[#00a884]/10 hover:bg-[#00a884]/20 border border-[#00a884]/30 transition-all relative">
                  <MessageCircle className="w-4 h-4 text-[#00a884]" />
                  <span className="text-xs font-semibold text-[#00a884] hidden sm:inline">Pulse</span>
                </button>
              </Link>
            )}

            {/* Notifications Bell — popover (auth) or route (anon) */}
            {me ? (
              <div className="relative flex-shrink-0">
                <button
                  onClick={() => toggle('bell')}
                  className="relative p-1.5 rounded-full hover:bg-white/10 transition"
                  title="Notifications"
                >
                  <Bell className="w-4 h-4 text-gray-400" />
                  <NotificationBadge />
                </button>

                {openPanel === 'bell' && (
                  <div
                    className={`${popoverBase} w-[calc(100vw-2rem)] sm:w-96 max-w-[24rem] max-h-[70vh] border-2 border-cyan-500/50 bg-neutral-900`}
                    data-popover onClick={e => e.stopPropagation()}
                  >
                    <div className="flex items-center justify-between p-3 border-b border-cyan-500/30">
                      <h3 className="text-sm font-bold flex items-center gap-2">
                        <Bell className="w-4 h-4 text-yellow-400" />
                        Notifications
                      </h3>
                      <button onClick={close} className="w-6 h-6 flex items-center justify-center rounded hover:bg-white/10" aria-label="Close">
                        <X className="w-4 h-4 text-gray-400" />
                      </button>
                    </div>
                    <div className="overflow-y-auto max-h-[calc(70vh-60px)]">
                      <Notifications closePopOver={close} />
                    </div>
                  </div>
                )}
              </div>
            ) : null}

            {/* Avatar user menu — verification + account settings accordions + logout */}
            {me?.profile?.userHandle && (
              <div className="relative flex-shrink-0">
                <button
                  onClick={() => toggle('avatar')}
                  className="p-0.5 rounded-full hover:bg-white/10 hover:ring-2 hover:ring-cyan-400 transition"
                  aria-label="Account menu"
                >
                  <Avatar linkToProfile={false} profile={{ profilePicture: me.profile.profilePicture }} pixels={28} />
                </button>

                {openPanel === 'avatar' && (
                  <div
                    ref={popoverRef}
                    className={`${popoverBase} w-[calc(100vw-2rem)] sm:w-80 max-w-[22rem] max-h-[85vh] overflow-y-auto border-2 border-cyan-500/50 bg-neutral-900`}
                    data-popover onClick={e => e.stopPropagation()}
                  >
                    {/* Header */}
                    <div className="flex items-center gap-3 p-3 border-b border-cyan-500/30 bg-cyan-950">
                      <Avatar linkToProfile={false} profile={{ profilePicture: me.profile.profilePicture }} pixels={48} />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold text-white truncate">
                          {me.profile.displayName || me.profile.userHandle || 'User'}
                        </div>
                        <div className="text-[11px] text-cyan-400 truncate">@{me.profile.userHandle}</div>
                      </div>
                      <button onClick={close} className="w-6 h-6 flex items-center justify-center rounded hover:bg-white/10" aria-label="Close">
                        <X className="w-4 h-4 text-gray-400" />
                      </button>
                    </div>

                    {/* Quick nav */}
                    <div className="py-2 border-b border-cyan-500/20">
                      <Link href={`/users/${me.profile.userHandle}`} className="flex items-center gap-3 px-3 py-2 text-sm text-white hover:bg-cyan-500/10">
                        <UserIcon className="w-4 h-4 text-cyan-400" />
                        <span className="flex-1">My Profile</span>
                      </Link>
                      <Link href="/wallet" className="flex items-center gap-3 px-3 py-2 text-sm text-white hover:bg-cyan-500/10">
                        <Wallet className="w-4 h-4 text-cyan-400" />
                        <span className="flex-1">Wallet</span>
                      </Link>
                      <Link href="/pulse" className="flex items-center gap-3 px-3 py-2 text-sm text-white hover:bg-cyan-500/10">
                        <MessageCircle className="w-4 h-4 text-cyan-400" />
                        <span className="flex-1">Inbox</span>
                      </Link>
                    </div>

                    {/* Get Verified accordion */}
                    <div className="py-1 border-b border-cyan-500/20">
                      <button
                        onClick={() => setShowVerification(v => !v)}
                        className="w-full flex items-center gap-3 px-3 py-2 text-sm text-white hover:bg-cyan-500/10"
                      >
                        <ShieldCheck className="w-4 h-4 text-purple-400" />
                        <span className="flex-1 text-left">Get Verified</span>
                        {existingRequest?.status === ProfileVerificationStatusType.Approved ? (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-green-500/20 text-green-400">Verified</span>
                        ) : existingRequest?.status === ProfileVerificationStatusType.Pending ? (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-400">Pending</span>
                        ) : (
                          showVerification ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />
                        )}
                      </button>

                      {showVerification && (
                        <div className="mx-3 mb-2 px-3 py-3 space-y-3 bg-black/30 rounded-lg border border-purple-500/20">
                          {existingRequest?.status === ProfileVerificationStatusType.Approved ? (
                            <div className="flex items-center gap-2 text-green-400 text-xs">
                              <Check className="w-3 h-3" /> Your profile is verified
                            </div>
                          ) : existingRequest?.status === ProfileVerificationStatusType.Pending ? (
                            <div className="flex items-center gap-2 text-yellow-400 text-xs">
                              <AlertCircle className="w-3 h-3" /> Verification request under review
                            </div>
                          ) : verifySuccess ? (
                            <div className="flex items-center gap-2 text-green-400 text-xs">
                              <Check className="w-3 h-3" /> Request submitted — we'll review shortly
                            </div>
                          ) : (
                            <>
                              <p className="text-[10px] text-gray-400">Provide at least one link to verify your artist identity.</p>
                              {verifyError && <p className="text-[10px] text-red-400">{verifyError}</p>}
                              <input
                                type="url"
                                value={verifySoundcloud}
                                onChange={e => setVerifySoundcloud(e.target.value)}
                                placeholder="SoundCloud URL"
                                className="w-full bg-black/50 border border-purple-500/20 rounded px-2.5 py-1.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-purple-400"
                              />
                              <input
                                type="url"
                                value={verifyYoutube}
                                onChange={e => setVerifyYoutube(e.target.value)}
                                placeholder="YouTube URL"
                                className="w-full bg-black/50 border border-purple-500/20 rounded px-2.5 py-1.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-purple-400"
                              />
                              <input
                                type="url"
                                value={verifyBandcamp}
                                onChange={e => setVerifyBandcamp(e.target.value)}
                                placeholder="Bandcamp URL"
                                className="w-full bg-black/50 border border-purple-500/20 rounded px-2.5 py-1.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-purple-400"
                              />
                              <button
                                onClick={handleVerificationSubmit}
                                disabled={verifyLoading || (!verifySoundcloud && !verifyYoutube && !verifyBandcamp)}
                                className="w-full py-1.5 text-xs font-semibold rounded bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white disabled:opacity-40 disabled:cursor-not-allowed"
                              >
                                {verifyLoading ? 'Submitting…' : 'Submit for Review'}
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Appearance — Dark / Light / Auto */}
                    <div className="py-2 px-3 border-b border-cyan-500/20">
                      <div className="flex items-center gap-2 mb-2">
                        {themeChoice === 'light' ? (
                          <Sun className="w-4 h-4 text-amber-400" />
                        ) : themeChoice === 'auto' ? (
                          <Monitor className="w-4 h-4 text-cyan-400" />
                        ) : (
                          <Moon className="w-4 h-4 text-cyan-400" />
                        )}
                        <span className="text-sm text-white">Appearance</span>
                      </div>
                      <div className="flex gap-1 bg-black/40 border border-cyan-500/20 rounded-lg p-1">
                        {([
                          { id: 'dark' as ThemeChoice, label: 'Dark', Icon: Moon },
                          { id: 'light' as ThemeChoice, label: 'Light', Icon: Sun },
                          { id: 'auto' as ThemeChoice, label: 'Auto', Icon: Monitor },
                        ]).map(({ id, label, Icon }) => {
                          const active = themeChoice === id
                          return (
                            <button
                              key={id}
                              onClick={() => setTheme(id)}
                              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded text-[11px] font-semibold transition ${
                                active
                                  ? 'bg-cyan-500/30 text-cyan-200 border border-cyan-400/50'
                                  : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'
                              }`}
                              aria-pressed={active}
                              aria-label={`${label} theme`}
                            >
                              <Icon className="w-3 h-3" />
                              {label}
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    {/* Admin: Verify Users — only for furdA1, jeremy_soundchain, tito */}
                    {me?.profile?.userHandle && ['furdA1', 'jeremy_soundchain', 'tito'].includes(me.profile.userHandle) && (
                      <div className="py-1 border-b border-yellow-500/30">
                        <Link href="/manage-requests" className="flex items-center gap-3 px-3 py-2 text-sm text-yellow-400 hover:bg-yellow-500/10">
                          <ShieldCheck className="w-4 h-4 text-yellow-400" />
                          <span className="flex-1">Admin: Verify Users</span>
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">ADMIN</span>
                        </Link>
                      </div>
                    )}

                    {/* Account Settings accordion */}
                    <div className="py-1 border-b border-cyan-500/20">
                      <button
                        onClick={() => setShowAccountSettings(v => !v)}
                        className="w-full flex items-center gap-3 px-3 py-2 text-sm text-white hover:bg-cyan-500/10"
                      >
                        <SettingsIcon className="w-4 h-4 text-cyan-400" />
                        <span className="flex-1 text-left">Account Settings</span>
                        {showAccountSettings ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                      </button>

                      {showAccountSettings && (
                        <div className="mx-3 mb-2 px-3 py-3 space-y-3 bg-black/30 rounded-lg border border-cyan-500/20">
                          {accountSettingsSuccess && (
                            <div className="flex items-center gap-2 text-green-400 text-xs bg-green-500/10 px-2 py-1.5 rounded">
                              <Check className="w-3 h-3" /> {accountSettingsSuccess}
                            </div>
                          )}

                          <div className="space-y-1.5">
                            <label className="text-[10px] text-gray-400 flex items-center gap-1.5">
                              <UserIcon className="w-3 h-3" /> Display Name
                            </label>
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={editDisplayName}
                                onChange={e => setEditDisplayName(e.target.value)}
                                className="flex-1 bg-black/50 border border-cyan-500/30 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                                placeholder="Display name"
                              />
                              <button
                                onClick={handleSaveDisplayName}
                                disabled={accountSettingsSaving || !editDisplayName.trim()}
                                className="px-3 text-xs font-semibold bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/50 rounded text-cyan-300 disabled:opacity-40 disabled:cursor-not-allowed"
                              >
                                {accountSettingsSaving ? '…' : 'Save'}
                              </button>
                            </div>
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-[10px] text-gray-400 flex items-center gap-1.5">
                              <AtSign className="w-3 h-3" /> Username
                            </label>
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={editHandle}
                                onChange={e => setEditHandle(e.target.value)}
                                className="flex-1 bg-black/50 border border-cyan-500/30 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                                placeholder="username"
                              />
                              <button
                                onClick={handleSaveHandle}
                                disabled={accountSettingsSaving || !editHandle.trim() || editHandle.trim().length < 2}
                                className="px-3 text-xs font-semibold bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/50 rounded text-cyan-300 disabled:opacity-40 disabled:cursor-not-allowed"
                              >
                                {accountSettingsSaving ? '…' : 'Save'}
                              </button>
                            </div>
                            <p className="text-[10px] text-gray-500">soundchain.io/dex/users/{editHandle || 'username'}</p>
                          </div>

                          {me?.nostrPubkey && (
                            <div className="space-y-1.5">
                              <label className="text-[10px] text-gray-400 flex items-center gap-1.5">
                                <Radio className="w-3 h-3 text-orange-400" /> Nostr Identity
                              </label>
                              <div className="flex items-center gap-2 bg-gradient-to-r from-orange-500/10 to-purple-500/10 border border-orange-500/30 rounded px-2.5 py-1.5">
                                <code className="flex-1 text-[10px] text-orange-300 font-mono truncate">
                                  {me.nostrPubkey.slice(0, 12)}…{me.nostrPubkey.slice(-8)}
                                </code>
                                <button
                                  onClick={async () => {
                                    try {
                                      await navigator.clipboard.writeText(me.nostrPubkey || '')
                                      setNostrPubkeyCopied(true)
                                      setTimeout(() => setNostrPubkeyCopied(false), 2000)
                                    } catch {}
                                  }}
                                  className="p-1 bg-orange-500/20 hover:bg-orange-500/30 rounded"
                                  title="Copy Nostr pubkey"
                                >
                                  {nostrPubkeyCopied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3 text-orange-400" />}
                                </button>
                              </div>
                              <p className="text-[10px] text-gray-500">Add this pubkey in Bitchat to receive notifications</p>
                            </div>
                          )}

                          <Link href="/settings" onClick={close}>
                            <span className="text-[11px] text-cyan-400 hover:text-cyan-300 cursor-pointer">More settings →</span>
                          </Link>
                        </div>
                      )}
                    </div>

                    {/* Logout */}
                    <div className="py-1">
                      <button
                        onClick={() => { close(); onLogout() }}
                        className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10"
                      >
                        <LogOut className="w-4 h-4" />
                        <span className="flex-1 text-left">Logout</span>
                      </button>
                    </div>

                    {/* Footer */}
                    <div className="px-3 py-2 border-t border-cyan-500/20 flex items-center justify-between text-[10px] text-gray-500">
                      <Link href="/privacy-policy" onClick={close} className="hover:text-cyan-400">PRIVACY POLICY</Link>
                      <span>v {config.appVersion}</span>
                    </div>
                  </div>
                )}
              </div>
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

      {/* FURL ticker — auth-gated; anon users see a slim promo strip instead */}
      {me ? (
        <AgentStatusTicker />
      ) : (
        <div className="w-full h-7 flex items-center justify-center px-3 bg-black/80 border-b border-white/5">
          <span className="text-[10px] font-mono text-gray-500">
            <span className="text-cyan-500/40">✶</span>
            <span className="mx-1.5">FURL — AI-powered forge terminal</span>
            <span className="text-gray-600">·</span>
            <span className="ml-1.5 text-cyan-500/50">available for members</span>
          </span>
        </div>
      )}

      {/* Ticker stack: Bloomberg + Sports — collapsible (FURL never touched) */}
      <div className="relative">
        {!tickerCollapsed && (
          <>
            <OgunPriceTicker />
            <SportsTickerStack />
          </>
        )}
        {/* Chevron minimizer — toggle ticker stack visibility */}
        <button
          onClick={() => setTickerCollapsed(c => !c)}
          className="absolute -bottom-3 left-1/2 -translate-x-1/2 z-20 w-6 h-6 flex items-center justify-center rounded-full bg-neutral-800 border border-white/10 hover:bg-neutral-700 transition shadow-lg"
          title={tickerCollapsed ? 'Show tickers' : 'Hide tickers'}
        >
          <ChevronDown className={`w-3 h-3 text-gray-400 transition-transform ${tickerCollapsed ? 'rotate-180' : ''}`} />
        </button>
      </div>
    </header>
  )
}
