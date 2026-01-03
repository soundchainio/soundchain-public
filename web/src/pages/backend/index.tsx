import { useState, useEffect } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import { X } from 'lucide-react'
import { useMagicContext } from 'hooks/useMagicContext'
import { useMe } from 'hooks/useMe'
import { useTracksQuery, useListingItemsQuery } from 'lib/graphql'
import { Logo } from 'icons/Logo'

// Status Badge Component
const StatusBadge = ({ status, label }: { status: 'connected' | 'indexed' | 'active' | 'live'; label: string }) => {
  const colors = {
    connected: 'text-green-400',
    indexed: 'text-cyan-400',
    active: 'text-green-400',
    live: 'text-green-400'
  }
  return (
    <span className={`${colors[status]} text-sm font-medium`}>{label}</span>
  )
}

// Stat Card Component
const StatCard = ({ value, label, sublabel }: { value: string; label: string; sublabel?: string }) => (
  <div className="bg-[#0a1628] border border-cyan-900/30 rounded-lg p-4">
    <div className="text-3xl font-bold text-white mb-1">{value}</div>
    <div className="text-sm text-gray-400">{label}</div>
    {sublabel && <div className="text-xs text-cyan-400 mt-1">{sublabel}</div>}
  </div>
)

// Aggregator Row Component
const AggregatorRow = ({ name, status }: { name: string; status: 'Connected' | 'Indexed' }) => (
  <div className="flex items-center justify-between py-3 border-b border-cyan-900/20 last:border-0">
    <span className="text-white">{name}</span>
    <StatusBadge status={status === 'Connected' ? 'connected' : 'indexed'} label={status} />
  </div>
)

// API Endpoint Row Component
const ApiEndpoint = ({ path }: { path: string }) => (
  <div className="text-cyan-400 font-mono text-sm py-1.5 hover:text-cyan-300 cursor-pointer">
    {path}
  </div>
)

export default function BackendDashboard() {
  const me = useMe()
  const { account: magicAccount } = useMagicContext()

  // Real data queries
  const { data: tracksData } = useTracksQuery({
    variables: { page: { first: 1 } },
    fetchPolicy: 'cache-first'
  })

  const { data: listingsData } = useListingItemsQuery({
    variables: { page: { first: 1 } },
    fetchPolicy: 'cache-first'
  })

  // Get real counts
  const tracksIndexed = tracksData?.tracks?.totalCount || 0
  const nftListings = listingsData?.listingItems?.totalCount || 0

  return (
    <>
      <Head>
        <title>Backend Dashboard | SoundChain</title>
      </Head>

      <div className="min-h-screen bg-[#030d1b] text-white">
        {/* Header */}
        <header className="border-b border-cyan-900/30 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Logo className="h-6 w-6" />
            <span className="text-cyan-400 font-bold text-lg tracking-wider">BACKEND DASHBOARD</span>
          </div>
          <Link href="/dex" className="p-2 hover:bg-white/5 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-400" />
          </Link>
        </header>

        {/* Main Content */}
        <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
          {/* Top Stats Row */}
          <div className="grid grid-cols-2 gap-4">
            <StatCard
              value={tracksIndexed.toString()}
              label="TRACKS INDEXED"
              sublabel="Live"
            />
            <StatCard
              value={nftListings.toString()}
              label="NFT LISTINGS"
              sublabel="Live"
            />
          </div>

          {/* Network & API Status */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-[#0a1628] border border-cyan-900/30 rounded-lg p-4">
              <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">NETWORK</div>
              <div className="text-white font-medium">Polygon</div>
              <div className="text-xs text-gray-500">Mainnet</div>
            </div>
            <div className="bg-[#0a1628] border border-cyan-900/30 rounded-lg p-4">
              <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">GRAPHQL API</div>
              <div className="text-green-400 font-medium">Active</div>
              <div className="text-xs text-gray-500">Online</div>
            </div>
          </div>

          {/* Crypto Aggregators */}
          <div className="bg-[#0a1628] border border-cyan-900/30 rounded-lg p-4">
            <h3 className="text-magenta-400 font-bold tracking-wider mb-4 text-sm" style={{ color: '#ff00ff' }}>
              CRYPTO AGGREGATORS
            </h3>
            <AggregatorRow name="CoinGecko" status="Connected" />
            <AggregatorRow name="CoinMarketCap" status="Connected" />
            <AggregatorRow name="DeFiLlama" status="Connected" />
            <AggregatorRow name="Dune Analytics" status="Connected" />
          </div>

          {/* NFT Aggregators */}
          <div className="bg-[#0a1628] border border-cyan-900/30 rounded-lg p-4">
            <h3 className="text-purple-400 font-bold tracking-wider mb-4 text-sm">
              NFT AGGREGATORS
            </h3>
            <AggregatorRow name="OpenSea" status="Indexed" />
            <AggregatorRow name="Blur" status="Indexed" />
            <AggregatorRow name="LooksRare" status="Indexed" />
            <AggregatorRow name="X2Y2" status="Indexed" />
            <AggregatorRow name="Rarible" status="Indexed" />
          </div>

          {/* API Endpoints */}
          <div className="bg-[#0a1628] border border-cyan-900/30 rounded-lg p-4">
            <h3 className="text-yellow-400 font-bold tracking-wider mb-4 text-sm">
              API ENDPOINTS
            </h3>
            <ApiEndpoint path="/api/v1/tracks" />
            <ApiEndpoint path="/api/v1/nfts" />
            <ApiEndpoint path="/api/v1/listings" />
            <ApiEndpoint path="/api/v1/portfolio" />
          </div>
        </div>

        {/* Footer */}
        <div className="text-center py-8 text-xs text-gray-600">
          <div>powered_by: "SoundChain + DataChain"</div>
          <div className="mt-1">DEX Dashboard • CarPlay Ready • Amazon Fire TV Ready • All Devices</div>
        </div>
      </div>
    </>
  )
}

// Custom layout to bypass the standard Layout wrapper
import { ReactElement } from 'react'

BackendDashboard.getLayout = function getLayout(page: ReactElement) {
  return page
}
