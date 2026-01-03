import { useState, useEffect } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import {
  DollarSign,
  Wallet,
  Image as ImageIcon,
  Play,
  Users,
  TrendingUp,
  Activity,
  Radio,
  Gift,
  Monitor,
  ExternalLink,
  Home,
  Search,
  Library,
  ShoppingBag,
  BarChart3,
  RefreshCw
} from 'lucide-react'
import { useMagicContext } from 'hooks/useMagicContext'
import { useMe } from 'hooks/useMe'
import { useUnifiedWallet } from 'contexts/UnifiedWalletContext'
import { useTracksQuery, useGroupedTracksQuery } from 'lib/graphql'
import { Logo } from 'icons/Logo'

// Stat Card Component
const StatCard = ({
  icon: Icon,
  value,
  label,
  change,
  prefix = ''
}: {
  icon: React.ElementType
  value: string
  label: string
  change?: string
  prefix?: string
}) => (
  <div className="bg-[#0a1628] border border-cyan-900/30 rounded-lg p-4">
    <div className="flex items-center justify-between mb-2">
      <Icon className="w-4 h-4 text-cyan-400" />
      {change && (
        <span className={`text-xs ${change.startsWith('+') ? 'text-green-400' : 'text-red-400'}`}>
          {change}
        </span>
      )}
    </div>
    <div className="text-2xl font-bold text-white">{prefix}{value}</div>
    <div className="text-xs text-gray-500 uppercase tracking-wider">{label}</div>
  </div>
)

// Connected Wallet Card
const WalletCard = ({
  address,
  chain,
  balance,
  currency,
  nftCount,
  nfts
}: {
  address: string
  chain: string
  balance: string
  currency: string
  nftCount: number
  nfts: string[]
}) => (
  <div className="bg-[#0a1628] border border-cyan-900/30 rounded-lg p-4 mb-4">
    <div className="flex items-center gap-2 mb-2">
      <div className="w-2 h-2 rounded-full bg-green-400" />
      <span className="text-cyan-400 font-mono text-sm">{address}</span>
    </div>
    <div className="flex items-center justify-between text-sm text-gray-400 mb-3">
      <span>{chain}</span>
      <span>{balance} {currency}</span>
      <span>{nftCount} NFTs</span>
    </div>
    <div className="text-xs text-cyan-400 uppercase tracking-wider mb-2">NFT Collection</div>
    <div className="grid grid-cols-8 gap-1">
      {nfts.slice(0, 16).map((nft, i) => (
        <div key={i} className="aspect-square bg-gray-800 rounded overflow-hidden">
          <img src={nft} alt="" className="w-full h-full object-cover" />
        </div>
      ))}
    </div>
  </div>
)

// Stream Platform Row
const StreamRow = ({
  platform,
  earnings,
  plays
}: {
  platform: string
  earnings: string
  plays: string
}) => (
  <div className="flex items-center justify-between py-3 border-b border-cyan-900/20 last:border-0">
    <span className="text-cyan-400 font-medium">{platform}</span>
    <span className="text-yellow-400 font-bold">${earnings}</span>
    <span className="text-gray-500 text-sm">{plays} plays</span>
  </div>
)

// Activity Item
const ActivityItem = ({
  type,
  amount,
  currency,
  description,
  address
}: {
  type: 'play' | 'royalty' | 'transfer'
  amount: string
  currency: string
  description: string
  address: string
}) => {
  const colors = {
    play: 'text-cyan-400',
    royalty: 'text-yellow-400',
    transfer: 'text-orange-400'
  }
  const icons = {
    play: '> NFT PLAY',
    royalty: '> ROYALTY',
    transfer: '> TRANSFER'
  }

  return (
    <div className="py-3 border-b border-cyan-900/20 last:border-0">
      <div className="flex justify-between items-center mb-1">
        <span className={`text-sm font-mono ${colors[type]}`}>{icons[type]}</span>
        <span className="text-white font-bold">{amount} {currency}</span>
      </div>
      <div className="text-xs text-gray-500">{description}</div>
      <div className="text-xs text-cyan-600 font-mono">{address}</div>
    </div>
  )
}

// Collaborator Row
const CollaboratorRow = ({
  name,
  earnings,
  address,
  collabs
}: {
  name: string
  earnings: string
  address: string
  collabs: number
}) => (
  <div className="flex items-center gap-3 py-3 border-b border-cyan-900/20 last:border-0">
    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-purple-500" />
    <div className="flex-1">
      <div className="text-white font-medium">{name}</div>
      <div className="text-xs text-cyan-600 font-mono">{address}</div>
    </div>
    <div className="text-right">
      <div className="text-yellow-400 font-bold">{earnings} ETH</div>
      <div className="text-xs text-gray-500">{collabs} collabs</div>
    </div>
  </div>
)

// Airdrop Row
const AirdropRow = ({
  protocol,
  amount,
  token,
  value,
  status
}: {
  protocol: string
  amount: string
  token: string
  value: string
  status: 'claimed' | 'pending'
}) => (
  <div className="flex items-center justify-between py-3 border-b border-cyan-900/20 last:border-0">
    <div>
      <div className="text-white font-medium">{protocol}</div>
      <div className="text-gray-500 text-sm">{amount} {token}</div>
    </div>
    <div className="text-right flex items-center gap-3">
      <span className={`text-xs px-2 py-1 rounded ${
        status === 'claimed' ? 'bg-green-900/50 text-green-400' : 'bg-yellow-900/50 text-yellow-400'
      }`}>
        {status}
      </span>
      <span className="text-white font-bold">${value}</span>
    </div>
  </div>
)

export default function BackendDashboard() {
  const me = useMe()

  // Real wallet data
  const { account: magicAccount, balance: maticBalance, ogunBalance, refetchBalance, isRefetchingBalance } = useMagicContext()
  const { activeAddress, activeBalance, activeOgunBalance, isConnected, chainName } = useUnifiedWallet()

  // Real data queries
  const { data: tracksData } = useTracksQuery({
    variables: { page: { first: 200 } },
    fetchPolicy: 'cache-first'
  })

  const { data: ownedTracksData } = useGroupedTracksQuery({
    variables: { page: { first: 100 } },
    skip: !me,
    fetchPolicy: 'cache-first'
  })

  // Use Magic wallet data or unified wallet data
  const displayAccount = magicAccount || activeAddress || ''
  const displayMaticBalance = maticBalance || activeBalance || '0.00'
  const displayOgunBalance = ogunBalance || activeOgunBalance || '0.00'

  // Real counts
  const totalTracks = tracksData?.tracks?.totalCount || 0
  const nftsMinted = ownedTracksData?.groupedTracks?.nodes?.length || 0

  // Mock data for sections without real data yet
  const mockNfts = Array(16).fill('/default-pictures/album-artwork.png')

  // Truncate address helper
  const truncateAddress = (addr: string) => addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : ''

  return (
    <>
      <Head>
        <title>Backend Dashboard | SoundChain</title>
      </Head>

      <div className="min-h-screen bg-[#030d1b] text-white">
        {/* Header with Navigation */}
        <header className="border-b border-cyan-900/30 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <Link href="/dex" className="flex items-center gap-2">
                <Logo className="h-8 w-8" />
                <span className="hidden md:block text-white font-bold">SoundChain</span>
              </Link>

              {/* Desktop Navigation */}
              <nav className="hidden md:flex items-center gap-4">
                <Link href="/dex" className="flex items-center gap-1.5 px-3 py-1.5 text-gray-400 hover:text-white transition-colors text-sm">
                  <Home className="w-4 h-4" />
                  <span>Home</span>
                </Link>
                <Link href="/dex?view=explore" className="flex items-center gap-1.5 px-3 py-1.5 text-gray-400 hover:text-white transition-colors text-sm">
                  <Search className="w-4 h-4" />
                  <span>Explore</span>
                </Link>
                <Link href="/dex?view=library" className="flex items-center gap-1.5 px-3 py-1.5 text-gray-400 hover:text-white transition-colors text-sm">
                  <Library className="w-4 h-4" />
                  <span>Library</span>
                </Link>
                <Link href="/dex?view=marketplace" className="flex items-center gap-1.5 px-3 py-1.5 text-gray-400 hover:text-white transition-colors text-sm">
                  <ShoppingBag className="w-4 h-4" />
                  <span>Market</span>
                </Link>
                <Link href="/backend" className="flex items-center gap-1.5 px-3 py-1.5 text-cyan-400 border-b-2 border-cyan-400 transition-colors text-sm">
                  <BarChart3 className="w-4 h-4" />
                  <span>Backend</span>
                </Link>
              </nav>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                <span className="text-xs text-green-400 font-mono hidden sm:block">LIVE</span>
              </div>
              {displayAccount && (
                <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-gray-800 border border-cyan-900/50 rounded-lg">
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  <span className="text-xs text-cyan-400 font-mono">{truncateAddress(displayAccount)}</span>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Title */}
        <div className="px-4 md:px-6 py-4 border-b border-cyan-900/30 bg-[#061220]">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-cyan-400 tracking-wider">
                WEB3 BACKEND DASHBOARD
              </h1>
              <div className="flex flex-wrap gap-2 mt-2">
                <span className="text-xs px-2 py-0.5 bg-cyan-900/30 text-cyan-400 rounded">
                  DECENTRALIZED
                </span>
                <span className="text-xs px-2 py-0.5 bg-cyan-900/30 text-cyan-400 rounded">
                  TRANSPARENT
                </span>
                <span className="text-xs px-2 py-0.5 bg-green-900/30 text-green-400 rounded">
                  ONLINE
                </span>
              </div>
            </div>
            <button
              onClick={() => refetchBalance()}
              disabled={isRefetchingBalance}
              className="px-4 py-2 bg-cyan-900/30 border border-cyan-500/50 text-cyan-400 rounded-lg hover:bg-cyan-900/50 transition-colors text-sm disabled:opacity-50 flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${isRefetchingBalance ? 'animate-spin' : ''}`} />
              {isRefetchingBalance ? 'Refreshing...' : 'Refresh Data'}
            </button>
          </div>
        </div>

        {/* Stats Row */}
        <div className="px-4 md:px-6 py-4">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4">
            <StatCard icon={DollarSign} value={displayOgunBalance} label="OGUN Balance" prefix="$" />
            <StatCard icon={ImageIcon} value={nftsMinted.toString()} label="NFTs Minted" />
            <StatCard icon={Play} value={totalTracks.toString()} label="Total Tracks" />
            <StatCard icon={Wallet} value={displayMaticBalance} label="MATIC Balance" prefix="$" />
            <StatCard icon={Users} value="12" label="Collaborations" />
            <StatCard icon={TrendingUp} value="478.74" label="Total Earnings" prefix="$" />
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="px-4 md:px-6 pb-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

            {/* Left Column - Connected Wallets */}
            <div className="lg:col-span-4">
              <div className="bg-[#061220] border border-cyan-900/30 rounded-lg p-4">
                <h3 className="text-cyan-400 font-bold tracking-wider mb-4 flex items-center gap-2">
                  <Wallet className="w-4 h-4" />
                  CONNECTED WALLETS
                </h3>

                {displayAccount ? (
                  <WalletCard
                    address={truncateAddress(displayAccount)}
                    chain="Polygon"
                    balance={displayMaticBalance}
                    currency="MATIC"
                    nftCount={nftsMinted}
                    nfts={mockNfts}
                  />
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Wallet className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>No wallet connected</p>
                    <p className="text-xs mt-1">Login to view your wallet</p>
                  </div>
                )}

                {/* OGUN Token Balance */}
                {displayAccount && (
                  <div className="bg-[#0a1628] border border-yellow-900/30 rounded-lg p-4 mt-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-yellow-400 font-bold">OGUN Token</span>
                      <span className="text-xs px-2 py-0.5 bg-yellow-900/30 text-yellow-400 rounded">ERC-20</span>
                    </div>
                    <div className="text-2xl font-bold text-white">{displayOgunBalance}</div>
                    <div className="text-xs text-gray-500 font-mono mt-1">
                      Contract: 0x45f1...a15c
                    </div>
                  </div>
                )}
              </div>

              {/* Collaborator Network */}
              <div className="bg-[#061220] border border-cyan-900/30 rounded-lg p-4 mt-6">
                <h3 className="text-cyan-400 font-bold tracking-wider mb-4 flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  COLLABORATOR NETWORK
                </h3>

                <CollaboratorRow
                  name="BeatMaker_SC"
                  earnings="3.2"
                  address="0x1a2b...9f8e"
                  collabs={4}
                />
                <CollaboratorRow
                  name="SynthWave.eth"
                  earnings="1.8"
                  address="0x7c8d...1e4f"
                  collabs={2}
                />
              </div>

              {/* Blockchain Bridges */}
              <div className="bg-[#061220] border border-cyan-900/30 rounded-lg p-4 mt-6">
                <h3 className="text-purple-400 font-bold tracking-wider mb-4">
                  BLOCKCHAIN BRIDGES
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between items-center py-2 border-b border-cyan-900/20">
                    <span className="text-gray-400">Polygon Bridge</span>
                    <span className="text-green-400">Active</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-cyan-900/20">
                    <span className="text-gray-400">LayerZero</span>
                    <span className="text-green-400">Active</span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-gray-400">Wormhole</span>
                    <span className="text-yellow-400">Pending</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Middle Column */}
            <div className="lg:col-span-4">
              {/* NFT Analytics */}
              <div className="bg-[#061220] border border-cyan-900/30 rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-cyan-400 font-bold tracking-wider flex items-center gap-2">
                    <ImageIcon className="w-4 h-4" />
                    NFT ANALYTICS
                  </h3>
                  <span className="text-xs px-2 py-1 bg-green-900/50 text-green-400 rounded">ACTIVE</span>
                </div>

                <div className="flex gap-2 mb-4">
                  <span className="text-xs px-2 py-1 bg-cyan-900/50 text-cyan-400 rounded">#1347</span>
                  <span className="text-xs px-2 py-1 bg-gray-800 text-gray-400 rounded">#992</span>
                </div>

                <div className="mb-4">
                  <div className="text-xs text-gray-500 uppercase mb-1">Track Info</div>
                  <div className="text-white font-medium">Neural Waves</div>
                  <div className="text-xs text-cyan-600 font-mono">INC: US-SC1-24-00147</div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <div className="text-xs text-gray-500 uppercase mb-1">Current Value</div>
                    <div className="text-white font-bold">1.2 ETH</div>
                    <div className="text-xs text-green-400">+160.5%</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 uppercase mb-1">Total Plays</div>
                    <div className="text-white font-bold">2,847</div>
                  </div>
                </div>

                <div className="pt-4 border-t border-cyan-900/30">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="text-xs text-gray-500 uppercase mb-1">Royalties Earned</div>
                      <div className="text-yellow-400 font-bold">0.087 ETH</div>
                    </div>
                    <span className="text-xs text-gray-500">3 transfers</span>
                  </div>
                </div>
              </div>

              {/* Stream Aggregator */}
              <div className="bg-[#061220] border border-cyan-900/30 rounded-lg p-4 mt-6">
                <h3 className="text-cyan-400 font-bold tracking-wider mb-4 flex items-center gap-2">
                  <Radio className="w-4 h-4" />
                  STREAM AGGREGATOR
                </h3>

                <StreamRow platform="SOUNDCHAIN" earnings="8.9" plays="34,782" />
                <StreamRow platform="SPOTIFY" earnings="4.2" plays="28,439" />
                <StreamRow platform="YOUTUBE MUSIC" earnings="3.1" plays="19,293" />
                <StreamRow platform="BANDCAMP" earnings="7.5" plays="6,918" />
              </div>

              {/* Royalty Splits */}
              <div className="bg-[#061220] border border-cyan-900/30 rounded-lg p-4 mt-6">
                <h3 className="text-yellow-400 font-bold tracking-wider mb-4">
                  ROYALTY SPLITS
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Primary Artist</span>
                    <span className="text-white font-bold">70%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Producer</span>
                    <span className="text-white font-bold">20%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Label</span>
                    <span className="text-white font-bold">10%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div className="lg:col-span-4">
              {/* Social Analytics */}
              <div className="bg-[#061220] border border-cyan-900/30 rounded-lg p-4">
                <h3 className="text-cyan-400 font-bold tracking-wider mb-4 flex items-center gap-2">
                  <Activity className="w-4 h-4" />
                  SOCIAL ANALYTICS
                </h3>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <div className="text-xs text-gray-500 uppercase">Posts</div>
                    <div className="text-2xl font-bold text-white">47</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 uppercase">Engagement</div>
                    <div className="text-2xl font-bold text-cyan-400">7.3%</div>
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-red-400">Likes</span>
                    <span className="text-white">1,284</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-green-400">Reposts</span>
                    <span className="text-white">342</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-400">Comments</span>
                    <span className="text-white">589</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-purple-400">Shares</span>
                    <span className="text-white">167</span>
                  </div>
                </div>
              </div>

              {/* Real-Time Activity */}
              <div className="bg-[#061220] border border-cyan-900/30 rounded-lg p-4 mt-6">
                <h3 className="text-cyan-400 font-bold tracking-wider mb-4 flex items-center gap-2">
                  <Activity className="w-4 h-4" />
                  REAL-TIME ACTIVITY
                </h3>

                <ActivityItem
                  type="play"
                  amount="0.001"
                  currency="ETH"
                  description="Neural Waves played by CryptoMusicFan"
                  address="0x1a2...8f9a"
                />
                <ActivityItem
                  type="royalty"
                  amount="0.087"
                  currency="ETH"
                  description="Royalty payment received"
                  address="0x2b4...7c87"
                />
                <ActivityItem
                  type="transfer"
                  amount="1.2"
                  currency="ETH"
                  description="NFT transferred to wallet"
                  address="0x51A...9abb"
                />
              </div>

              {/* Airdrop Tracker */}
              <div className="bg-[#061220] border border-cyan-900/30 rounded-lg p-4 mt-6">
                <h3 className="text-cyan-400 font-bold tracking-wider mb-4 flex items-center gap-2">
                  <Gift className="w-4 h-4" />
                  AIRDROP TRACKER
                </h3>

                <AirdropRow protocol="LAYERZERO" amount="105" token="ZRO" value="89.5" status="claimed" />
                <AirdropRow protocol="ARBITRUM" amount="847" token="ARB" value="234.7" status="claimed" />
                <AirdropRow protocol="STARKNET" amount="420" token="STRK" value="156.3" status="pending" />
              </div>

              {/* System Monitor */}
              <div className="bg-[#061220] border border-cyan-900/30 rounded-lg p-4 mt-6">
                <h3 className="text-cyan-400 font-bold tracking-wider mb-4 flex items-center gap-2">
                  <Monitor className="w-4 h-4" />
                  SYSTEM_MONITOR
                </h3>

                <div className="flex items-center justify-center py-6">
                  <div className="text-center">
                    <div className="text-green-400 font-bold tracking-wider mb-2">
                      ALL SYSTEMS OPERATIONAL
                    </div>
                    <div className="text-xs text-gray-500">Google Cloud Platform</div>
                  </div>
                </div>

                <a
                  href="https://polygonscan.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full mt-4 px-4 py-2 bg-yellow-500/20 border border-yellow-500/50 text-yellow-400 rounded-lg hover:bg-yellow-500/30 transition-colors text-sm font-bold"
                >
                  POLYGONSCAN
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Bottom Navigation */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-[#030d1b] border-t border-cyan-900/30 px-4 py-2 z-50">
          <div className="flex items-center justify-around">
            <Link href="/dex" className="flex flex-col items-center gap-1 text-gray-400 hover:text-white">
              <Home className="w-5 h-5" />
              <span className="text-[10px]">Home</span>
            </Link>
            <Link href="/dex?view=explore" className="flex flex-col items-center gap-1 text-gray-400 hover:text-white">
              <Search className="w-5 h-5" />
              <span className="text-[10px]">Explore</span>
            </Link>
            <Link href="/dex?view=library" className="flex flex-col items-center gap-1 text-gray-400 hover:text-white">
              <Library className="w-5 h-5" />
              <span className="text-[10px]">Library</span>
            </Link>
            <Link href="/dex?view=marketplace" className="flex flex-col items-center gap-1 text-gray-400 hover:text-white">
              <ShoppingBag className="w-5 h-5" />
              <span className="text-[10px]">Market</span>
            </Link>
            <Link href="/backend" className="flex flex-col items-center gap-1 text-cyan-400">
              <BarChart3 className="w-5 h-5" />
              <span className="text-[10px]">Backend</span>
            </Link>
          </div>
        </nav>

        {/* Bottom spacing for mobile nav */}
        <div className="md:hidden h-16" />
      </div>
    </>
  )
}

// Custom layout to bypass the standard Layout wrapper
import { ReactElement } from 'react'

BackendDashboard.getLayout = function getLayout(page: ReactElement) {
  return page
}
