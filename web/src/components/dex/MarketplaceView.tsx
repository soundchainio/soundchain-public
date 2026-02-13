import React, { useState, useMemo } from 'react'
import {
  Search, Filter, Grid, List, ChevronDown, ChevronUp, X, Zap,
  TrendingUp, Clock, DollarSign, Layers, Globe, Shield, Activity,
  Sparkles, Package, Image as ImageIcon, Coins, SlidersHorizontal,
  ArrowUpDown, Check, Star, Flame, Eye
} from 'lucide-react'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Card } from '../ui/card'
import { TrackNFTCard } from './TrackNFTCard'
import { TokenCard } from './TokenCard'
import { BundleCard } from './BundleCard'
import { SUPPORTED_TOKENS, TOKEN_INFO } from '../../constants/tokens'

// Chain configurations
const CHAINS = [
  { id: 137, name: 'Polygon', icon: '🟣', color: 'text-purple-400' },
  { id: 1, name: 'Ethereum', icon: '⟠', color: 'text-blue-400' },
  { id: 56, name: 'BSC', icon: '🟡', color: 'text-yellow-400' },
  { id: 43114, name: 'Avalanche', icon: '🔺', color: 'text-red-400' },
  { id: 7000, name: 'ZetaChain', icon: '⚡', color: 'text-green-400' },
  { id: 8453, name: 'Base', icon: '🔵', color: 'text-blue-300' },
]

// Sale types
const SALE_TYPES = [
  { id: 'all', label: 'ALL TYPES', icon: Layers },
  { id: 'fixed', label: 'FIXED PRICE', icon: DollarSign },
  { id: 'auction', label: 'AUCTION', icon: Clock },
  { id: 'bundle', label: 'BUNDLE', icon: Package },
]

// Sort options
const SORT_OPTIONS = [
  { id: 'recently_listed', label: 'Recently Listed', icon: Clock },
  { id: 'price_low', label: 'Price: Low → High', icon: ArrowUpDown },
  { id: 'price_high', label: 'Price: High → Low', icon: ArrowUpDown },
  { id: 'most_viewed', label: 'Most Viewed', icon: Eye },
  { id: 'ending_soon', label: 'Ending Soon', icon: Flame },
]

interface MarketplaceViewProps {
  tracks: any[]
  tokenListings: any[]
  bundleListings: any[]
  loading: boolean
  onPlay: (track: any, index: number, playlist: any[]) => void
  isPlaying: boolean
  currentTrackId?: string
  account?: string
  onCreateTokenListing: () => void
  onCreateBundleListing: () => void
  onSweepClick?: () => void
}

// Collapsible Filter Section
const FilterSection = ({
  title,
  icon: Icon,
  children,
  defaultOpen = true
}: {
  title: string
  icon: React.ElementType
  children: React.ReactNode
  defaultOpen?: boolean
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <div className="border-b border-cyan-500/10">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between py-3 px-1 hover:bg-cyan-500/5 transition-colors group"
      >
        <div className="flex items-center gap-2">
          <span className="text-cyan-500 font-mono text-xs">"</span>
          <Icon className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-xs font-mono text-cyan-400">{title}</span>
          <span className="text-cyan-500 font-mono text-xs">":</span>
        </div>
        {isOpen ? (
          <ChevronUp className="w-4 h-4 text-cyan-500/50 group-hover:text-cyan-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-cyan-500/50 group-hover:text-cyan-400" />
        )}
      </button>
      {isOpen && <div className="pb-4 px-1">{children}</div>}
    </div>
  )
}

export const MarketplaceView: React.FC<MarketplaceViewProps> = ({
  tracks,
  tokenListings,
  bundleListings,
  loading,
  onPlay,
  isPlaying,
  currentTrackId,
  account,
  onCreateTokenListing,
  onCreateBundleListing,
  onSweepClick,
}) => {
  // View state
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [showFilters, setShowFilters] = useState(true)
  const [showMobileFilters, setShowMobileFilters] = useState(false)

  // Filter state
  const [activeTab, setActiveTab] = useState<'nft' | 'token' | 'bundle' | 'sweep'>('nft')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState('recently_listed')
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 10000])
  const [selectedSaleType, setSelectedSaleType] = useState('all')
  const [selectedChain, setSelectedChain] = useState<number | null>(null)
  const [acceptedCurrencies, setAcceptedCurrencies] = useState<string[]>([])

  // Get display symbol helper
  const getDisplaySymbol = (token: string) => {
    if (token === 'MATIC') return 'POL'
    return token
  }

  // Filter tracks that have listings and match currency filters
  const listedTracks = useMemo(() => {
    return tracks.filter(t => {
      if (!t.listingItem) return false

      // If no currency filters selected, show all
      if (acceptedCurrencies.length === 0) return true

      // Check if listing accepts any of the selected currencies
      // A listing accepts OGUN if it has an OGUNPricePerItem set
      // A listing accepts POL/MATIC if it has a pricePerItem set
      const listing = t.listingItem
      const hasOGUNPrice = listing.OGUNPricePerItem && parseFloat(listing.OGUNPricePerItem) > 0
      const hasMATICPrice = listing.pricePerItem && parseFloat(listing.pricePerItem) > 0

      if (acceptedCurrencies.includes('OGUN') && hasOGUNPrice) return true
      if (acceptedCurrencies.includes('POL') && hasMATICPrice) return true
      if (acceptedCurrencies.includes('MATIC') && hasMATICPrice) return true

      // If user selected currencies but this listing doesn't match, exclude it
      return false
    })
  }, [tracks, acceptedCurrencies])

  // Calculate stats
  const stats = useMemo(() => ({
    totalListings: listedTracks.length + tokenListings.length + bundleListings.length,
    nftCount: listedTracks.length,
    tokenCount: tokenListings.length,
    bundleCount: bundleListings.length,
    floorPrice: listedTracks.length > 0
      ? Math.min(...listedTracks.map(t => t.listingItem?.pricePerItemToShow || 999999))
      : 0
  }), [listedTracks, tokenListings, bundleListings])

  // Toggle currency filter
  const toggleCurrency = (currency: string) => {
    setAcceptedCurrencies(prev =>
      prev.includes(currency)
        ? prev.filter(c => c !== currency)
        : [...prev, currency]
    )
  }

  // Clear all filters
  const clearFilters = () => {
    setSearchQuery('')
    setPriceRange([0, 10000])
    setSelectedSaleType('all')
    setSelectedChain(null)
    setAcceptedCurrencies([])
  }

  const hasActiveFilters = searchQuery || selectedSaleType !== 'all' || selectedChain || acceptedCurrencies.length > 0

  // Filter sidebar component
  const FilterSidebar = ({ mobile = false }: { mobile?: boolean }) => (
    <div className={`${mobile ? 'p-4' : ''} space-y-1`}>
      {/* Search */}
      <FilterSection title="search_query" icon={Search} defaultOpen={true}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="{ token_id, isrc, asset..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-gray-900/80 border border-cyan-500/20 rounded-lg pl-10 pr-4 py-2.5 text-sm text-gray-300 placeholder-gray-600 focus:border-cyan-500/50 focus:outline-none transition-colors"
          />
        </div>
      </FilterSection>

      {/* Sort Order */}
      <FilterSection title="sort_order" icon={ArrowUpDown} defaultOpen={true}>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="w-full bg-gray-900/80 border border-cyan-500/20 rounded-lg px-4 py-2.5 text-sm text-gray-300 focus:border-cyan-500/50 focus:outline-none appearance-none cursor-pointer"
          style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2322d3ee'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center', backgroundSize: '16px' }}
        >
          {SORT_OPTIONS.map(opt => (
            <option key={opt.id} value={opt.id}>{opt.label}</option>
          ))}
        </select>
      </FilterSection>

      {/* Price Range */}
      <FilterSection title="price_range_usd" icon={DollarSign} defaultOpen={true}>
        <div className="space-y-3">
          <input
            type="range"
            min="0"
            max="10000"
            value={priceRange[1]}
            onChange={(e) => setPriceRange([priceRange[0], parseInt(e.target.value)])}
            className="w-full accent-cyan-500"
          />
          <div className="flex gap-2">
            <div className="flex-1 bg-gray-900/80 border border-cyan-500/20 rounded px-3 py-2 text-center">
              <span className="text-cyan-400 font-mono text-sm">${priceRange[0]}</span>
            </div>
            <span className="text-gray-600 self-center">→</span>
            <div className="flex-1 bg-cyan-500/20 border border-cyan-500/30 rounded px-3 py-2 text-center">
              <span className="text-cyan-400 font-mono text-sm">${priceRange[1].toLocaleString()}</span>
            </div>
          </div>
        </div>
      </FilterSection>

      {/* Sale Type */}
      <FilterSection title="sale_type" icon={Layers} defaultOpen={true}>
        <select
          value={selectedSaleType}
          onChange={(e) => setSelectedSaleType(e.target.value)}
          className="w-full bg-gray-900/80 border border-cyan-500/20 rounded-lg px-4 py-2.5 text-sm text-gray-300 focus:border-cyan-500/50 focus:outline-none appearance-none cursor-pointer"
          style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2322d3ee'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center', backgroundSize: '16px' }}
        >
          {SALE_TYPES.map(type => (
            <option key={type.id} value={type.id}>{type.label}</option>
          ))}
        </select>
      </FilterSection>

      {/* Blockchain */}
      <FilterSection title="blockchain" icon={Globe} defaultOpen={true}>
        <select
          value={selectedChain || 'all'}
          onChange={(e) => setSelectedChain(e.target.value === 'all' ? null : parseInt(e.target.value))}
          className="w-full bg-gray-900/80 border border-cyan-500/20 rounded-lg px-4 py-2.5 text-sm text-gray-300 focus:border-cyan-500/50 focus:outline-none appearance-none cursor-pointer"
          style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2322d3ee'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center', backgroundSize: '16px' }}
        >
          <option value="all">ALL_CHAINS</option>
          {CHAINS.map(chain => (
            <option key={chain.id} value={chain.id}>{chain.icon} {chain.name.toUpperCase()}</option>
          ))}
        </select>
      </FilterSection>

      {/* Accepted Currencies */}
      <FilterSection title="accepted_currencies" icon={Coins} defaultOpen={false}>
        <div className="grid grid-cols-2 gap-2">
          {SUPPORTED_TOKENS.slice(0, 16).map(token => (
            <label
              key={token}
              className={`flex items-center gap-2 px-3 py-2 rounded cursor-pointer transition-all ${
                acceptedCurrencies.includes(token)
                  ? 'bg-cyan-500/20 border border-cyan-500/40'
                  : 'bg-gray-900/50 border border-gray-800 hover:border-gray-700'
              }`}
            >
              <input
                type="checkbox"
                checked={acceptedCurrencies.includes(token)}
                onChange={() => toggleCurrency(token)}
                className="sr-only"
              />
              <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                acceptedCurrencies.includes(token)
                  ? 'bg-cyan-500 border-cyan-500'
                  : 'border-gray-600'
              }`}>
                {acceptedCurrencies.includes(token) && <Check className="w-3 h-3 text-black" />}
              </div>
              <span className={`text-xs font-mono ${
                acceptedCurrencies.includes(token) ? 'text-cyan-400' : 'text-gray-400'
              }`}>
                {getDisplaySymbol(token)}
              </span>
            </label>
          ))}
        </div>
        {SUPPORTED_TOKENS.length > 16 && (
          <button className="w-full mt-2 text-xs text-cyan-500 hover:text-cyan-400">
            + {SUPPORTED_TOKENS.length - 16} more tokens
          </button>
        )}
      </FilterSection>

      {/* Clear Filters */}
      {hasActiveFilters && (
        <button
          onClick={clearFilters}
          className="w-full mt-4 py-2 text-xs text-red-400 hover:text-red-300 border border-red-500/20 rounded hover:bg-red-500/10 transition-colors"
        >
          Clear All Filters
        </button>
      )}
    </div>
  )

  return (
    <div className="min-h-screen bg-black">
      {/* Terminal Header */}
      <div className="border-b border-cyan-500/20 bg-gray-950/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-[1800px] mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            {/* Logo / Title */}
            <div className="flex items-center gap-3">
              <span className="text-cyan-500 font-mono text-lg">{'{'}</span>
              <h1 className="font-mono font-bold text-white tracking-wider">
                WEB3_MARKETPLACE<span className="text-cyan-400">.EXE</span>
              </h1>
              <span className="text-cyan-500 font-mono text-lg">{'}'}</span>
            </div>

            {/* Center Tabs */}
            <div className="hidden md:flex items-center gap-1 bg-gray-900/50 rounded-lg p-1 border border-gray-800">
              {[
                { id: 'nft', label: 'NFT', icon: ImageIcon },
                { id: 'token', label: 'TOKEN', icon: Coins },
                { id: 'bundle', label: 'BUNDLE', icon: Package },
                { id: 'sweep', label: 'SWEEP', icon: Layers },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-md text-xs font-mono transition-all ${
                    activeTab === tab.id
                      ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                      : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-3">
              {/* View Toggle */}
              <div className="flex items-center bg-gray-900/50 rounded-lg p-1 border border-gray-800">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded transition-all ${viewMode === 'grid' ? 'bg-cyan-500/20 text-cyan-400' : 'text-gray-500 hover:text-white'}`}
                >
                  <Grid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded transition-all ${viewMode === 'list' ? 'bg-cyan-500/20 text-cyan-400' : 'text-gray-500 hover:text-white'}`}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>

              {/* Fee Badge */}
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-green-500/10 border border-green-500/30 rounded-lg">
                <Zap className="w-3.5 h-3.5 text-green-400" />
                <span className="text-xs font-mono text-green-400">FEE: 0.05%</span>
              </div>

              {/* Connect Button */}
              {!account && (
                <Button className="bg-cyan-500 hover:bg-cyan-600 text-black font-mono text-xs px-4">
                  <Shield className="w-4 h-4 mr-2" />
                  CONNECT
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Filter Toggle */}
      <button
        onClick={() => setShowMobileFilters(true)}
        className="lg:hidden fixed bottom-20 left-4 z-50 bg-cyan-500 text-black p-3 rounded-full shadow-lg shadow-cyan-500/30"
      >
        <Filter className="w-5 h-5" />
      </button>

      {/* Mobile Filter Drawer */}
      {showMobileFilters && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/80" onClick={() => setShowMobileFilters(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-80 bg-gray-950 border-r border-cyan-500/20 overflow-y-auto">
            <div className="sticky top-0 bg-gray-950 border-b border-cyan-500/20 p-4 flex items-center justify-between">
              <span className="font-mono text-cyan-400">FILTERS</span>
              <button onClick={() => setShowMobileFilters(false)}>
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <FilterSidebar mobile />
          </div>
        </div>
      )}

      {/* Main Layout */}
      <div className="max-w-[1800px] mx-auto flex">
        {/* Desktop Filter Sidebar */}
        <aside className={`hidden lg:block sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto transition-all duration-300 ${
          showFilters ? 'w-72' : 'w-0'
        }`}>
          {showFilters && (
            <div className="p-4 border-r border-cyan-500/10">
              <FilterSidebar />
            </div>
          )}
        </aside>

        {/* Main Content */}
        <main className="flex-1 min-w-0">
          {/* Results Bar */}
          <div className="sticky top-16 z-30 bg-gray-950/95 backdrop-blur-sm border-b border-cyan-500/10 px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {/* Filter Toggle (Desktop) */}
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="hidden lg:flex items-center gap-2 px-3 py-2 bg-gray-900/50 hover:bg-gray-800/50 rounded-lg border border-gray-800 transition-colors"
                >
                  {showFilters ? <X className="w-4 h-4" /> : <Filter className="w-4 h-4" />}
                  <span className="text-xs font-mono">{showFilters ? 'HIDE' : 'FILTERS'}</span>
                </button>

                {/* Results Count */}
                <div className="flex items-center gap-2 font-mono">
                  <span className="text-cyan-500">"nfts_found":</span>
                  <span className="text-white font-bold">{stats.totalListings}</span>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="hidden md:flex items-center gap-4 text-xs font-mono">
                <span className="text-gray-500">
                  Floor: <span className="text-green-400">{stats.floorPrice > 0 ? `${stats.floorPrice} MATIC` : '—'}</span>
                </span>
                <span className="text-gray-500">
                  NFTs: <span className="text-purple-400">{stats.nftCount}</span>
                </span>
                <span className="text-gray-500">
                  Tokens: <span className="text-cyan-400">{stats.tokenCount}</span>
                </span>
              </div>
            </div>
          </div>

          {/* OGUN L2 Featured Banner */}
          <div className="p-4">
            <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-cyan-900/30 via-purple-900/30 to-pink-900/30 p-6 border border-cyan-500/20">
              <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-5" />
              <div className="relative flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-cyan-500 to-purple-500 flex items-center justify-center">
                    <Zap className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/30 text-[10px]">
                        <Zap className="w-3 h-3 mr-1" /> L2 POWERED
                      </Badge>
                      <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-[10px]">
                        <Activity className="w-3 h-3 mr-1" /> LIVE
                      </Badge>
                    </div>
                    <h2 className="font-mono text-white font-bold">OGUN Gas Economy</h2>
                    <p className="text-xs text-gray-400">0.05% fees • Deflationary burns • 24 token support</p>
                  </div>
                </div>
                <div className="hidden md:flex items-center gap-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-cyan-400">{SUPPORTED_TOKENS.length}</div>
                    <div className="text-[10px] text-gray-500 uppercase">Tokens</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-400">0.05%</div>
                    <div className="text-[10px] text-gray-500 uppercase">Max Fee</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-400">
                      <Flame className="w-6 h-6 inline" />
                    </div>
                    <div className="text-[10px] text-gray-500 uppercase">Burns</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Content Grid */}
          <div className="p-4">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="animate-spin w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full" />
                <span className="ml-3 font-mono text-gray-400">Loading marketplace...</span>
              </div>
            ) : (
              <>
                {activeTab === 'nft' && (
                  <>
                    {listedTracks.length > 0 ? (
                      <div className={viewMode === 'grid'
                        ? 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3'
                        : 'space-y-1 bg-gray-900/30 rounded-lg overflow-hidden border border-gray-800/50'
                      }>
                        {viewMode === 'list' && (
                          <div className="flex items-center gap-3 px-3 py-2 bg-gray-800/50 border-b border-gray-700/50 text-xs text-gray-500 font-mono">
                            <span className="w-6 text-center">#</span>
                            <span className="w-10"></span>
                            <span className="flex-1">ITEM</span>
                            <span className="hidden sm:block w-16 text-right">PLAYS</span>
                            <span className="hidden sm:block w-12 text-right">TIME</span>
                            <span className="w-24 text-right">PRICE</span>
                            <span className="w-16"></span>
                          </div>
                        )}
                        {listedTracks.map((track, index) => (
                          <TrackNFTCard
                            key={track.id}
                            track={track}
                            onPlay={() => onPlay(track, index, listedTracks)}
                            isPlaying={isPlaying}
                            isCurrentTrack={currentTrackId === track.id}
                            listView={viewMode === 'list'}
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-20">
                        <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center">
                          <ImageIcon className="w-10 h-10 text-purple-400" />
                        </div>
                        <h3 className="font-mono text-white text-lg mb-2">No NFTs Listed</h3>
                        <p className="text-gray-500 text-sm mb-6">Be the first to list your music NFTs on the L2 marketplace</p>
                        <Button className="bg-purple-500 hover:bg-purple-600 text-white font-mono">
                          <Sparkles className="w-4 h-4 mr-2" /> List Your NFT
                        </Button>
                      </div>
                    )}
                  </>
                )}

                {activeTab === 'token' && (
                  <>
                    {tokenListings.length > 0 ? (
                      <div className={viewMode === 'grid'
                        ? 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3'
                        : 'space-y-1 bg-gray-900/30 rounded-lg overflow-hidden border border-gray-800/50'
                      }>
                        {tokenListings.map((token) => (
                          <TokenCard
                            key={token.id}
                            token={token}
                            onPurchase={() => {}}
                            isWalletConnected={!!account}
                            listView={viewMode === 'list'}
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-20">
                        <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-green-500/20 to-cyan-500/20 flex items-center justify-center">
                          <Coins className="w-10 h-10 text-green-400" />
                        </div>
                        <h3 className="font-mono text-white text-lg mb-2">Token Marketplace</h3>
                        <p className="text-gray-500 text-sm mb-6 max-w-md mx-auto">
                          List and trade any of our {SUPPORTED_TOKENS.length} supported tokens with 0.05% fees
                        </p>
                        <Button
                          onClick={onCreateTokenListing}
                          className="bg-green-500 hover:bg-green-600 text-black font-mono"
                        >
                          <Coins className="w-4 h-4 mr-2" /> List Tokens
                        </Button>
                      </div>
                    )}
                  </>
                )}

                {activeTab === 'bundle' && (
                  <>
                    {bundleListings.length > 0 ? (
                      <div className={viewMode === 'grid'
                        ? 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3'
                        : 'space-y-1 bg-gray-900/30 rounded-lg overflow-hidden border border-gray-800/50'
                      }>
                        {bundleListings.map((bundle) => (
                          <BundleCard
                            key={bundle.id}
                            bundle={bundle}
                            onPurchase={() => {}}
                            listView={viewMode === 'list'}
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-20">
                        <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-purple-500/20 flex items-center justify-center">
                          <Package className="w-10 h-10 text-cyan-400" />
                        </div>
                        <h3 className="font-mono text-white text-lg mb-2">Bundle Marketplace</h3>
                        <p className="text-gray-500 text-sm mb-6 max-w-md mx-auto">
                          Create exclusive bundles: NFTs + Tokens + Real-world perks
                        </p>
                        <Button
                          onClick={onCreateBundleListing}
                          className="bg-cyan-500 hover:bg-cyan-600 text-black font-mono"
                        >
                          <Package className="w-4 h-4 mr-2" /> Create Bundle
                        </Button>
                      </div>
                    )}
                  </>
                )}

                {activeTab === 'sweep' && (
                  <div className="text-center py-20">
                    <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-yellow-500/20 to-orange-500/20 flex items-center justify-center">
                      <Layers className="w-10 h-10 text-yellow-400" />
                    </div>
                    <h3 className="font-mono text-white text-lg mb-2">Sweep Mode</h3>
                    <p className="text-gray-500 text-sm mb-6 max-w-md mx-auto">
                      Bulk purchase multiple NFTs in a single transaction. Select NFTs from the grid and sweep them all at once!
                    </p>
                    {onSweepClick ? (
                      <Button
                        onClick={onSweepClick}
                        className="bg-yellow-500 hover:bg-yellow-600 text-black font-mono"
                      >
                        <Layers className="w-4 h-4 mr-2" /> Open Sweep Panel
                      </Button>
                    ) : (
                      <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
                        <Clock className="w-3 h-3 mr-1" /> Coming Soon
                      </Badge>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}

export default MarketplaceView
