/**
 * Omnichain Wallet Dashboard
 * Displays aggregated balances and NFTs from multiple chains
 * Features: Multi-chain balances, Polygon NFT display, ZetaChain ready
 */

import React, { useState } from 'react'
import { Card } from '../ui/card'
import { Badge } from '../ui/badge'
import {
  RefreshCw,
  Wallet,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Coins,
  Image as ImageIcon,
  Zap
} from 'lucide-react'
import { useMultiChainBalances, ChainBalance } from '../../hooks/useMultiChainBalances'
import { usePolygonNFTs, PolygonNFT } from '../../hooks/usePolygonNFTs'
import { CHAINS } from '../../constants/chains'
import { getIpfsUrl } from '../../utils/ipfs'

interface OmnichainWalletDashboardProps {
  walletAddress?: string
  onPlayTrack?: (nft: PolygonNFT) => void
}

export function OmnichainWalletDashboard({
  walletAddress,
  onPlayTrack
}: OmnichainWalletDashboardProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['balances', 'nfts']))
  const [selectedChain, setSelectedChain] = useState<string | null>(null)

  // Multi-chain balance aggregation
  const {
    balances,
    totalOgunBalance,
    isLoading: balancesLoading,
    refetch: refetchBalances
  } = useMultiChainBalances(walletAddress)

  // Polygon NFT fetching for legacy users
  const {
    nfts,
    isLoading: nftsLoading,
    error: nftsError,
    refetch: refetchNFTs
  } = usePolygonNFTs(walletAddress)

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev)
      if (next.has(section)) {
        next.delete(section)
      } else {
        next.add(section)
      }
      return next
    })
  }

  const formatAddress = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`

  if (!walletAddress) {
    return (
      <Card className="retro-card p-8 text-center">
        <Wallet className="w-12 h-12 text-gray-600 mx-auto mb-3" />
        <p className="text-gray-400">Connect a wallet to view omnichain assets</p>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Omnichain Dashboard</h2>
            <p className="text-xs text-gray-500 font-mono">{formatAddress(walletAddress)}</p>
          </div>
        </div>
        <button
          onClick={() => { refetchBalances(); refetchNFTs(); }}
          disabled={balancesLoading || nftsLoading}
          className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 text-cyan-400 ${(balancesLoading || nftsLoading) ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Total OGUN Balance Card */}
      <Card className="retro-card p-4 bg-gradient-to-r from-purple-900/30 to-cyan-900/30 border-purple-500/30">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wider">Total OGUN Balance</p>
            <p className="text-3xl font-bold text-white mt-1">{totalOgunBalance}</p>
            <p className="text-xs text-purple-400">Across all chains</p>
          </div>
          <div className="w-16 h-16 rounded-full bg-purple-500/20 flex items-center justify-center">
            <Coins className="w-8 h-8 text-purple-400" />
          </div>
        </div>
      </Card>

      {/* Multi-Chain Balances */}
      <Card className="retro-card overflow-hidden">
        <button
          className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors"
          onClick={() => toggleSection('balances')}
        >
          <div className="flex items-center gap-3">
            <Wallet className="w-5 h-5 text-cyan-400" />
            <span className="font-bold text-white">Chain Balances</span>
            <Badge className="bg-cyan-500/20 text-cyan-400 text-xs">
              {balances.filter(b => parseFloat(b.nativeBalance) > 0 || parseFloat(b.ogunBalance) > 0).length} Active
            </Badge>
          </div>
          {expandedSections.has('balances') ? (
            <ChevronUp className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          )}
        </button>

        {expandedSections.has('balances') && (
          <div className="border-t border-cyan-500/20 p-4 space-y-2">
            {balancesLoading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="w-6 h-6 text-cyan-400 animate-spin" />
              </div>
            ) : (
              balances.map((balance) => (
                <ChainBalanceRow
                  key={balance.chainId}
                  balance={balance}
                  isSelected={selectedChain === balance.chainId}
                  onSelect={() => setSelectedChain(
                    selectedChain === balance.chainId ? null : balance.chainId
                  )}
                />
              ))
            )}
          </div>
        )}
      </Card>

      {/* Polygon NFT Collection */}
      <Card className="retro-card overflow-hidden">
        <button
          className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors"
          onClick={() => toggleSection('nfts')}
        >
          <div className="flex items-center gap-3">
            <ImageIcon className="w-5 h-5 text-purple-400" />
            <span className="font-bold text-white">Polygon NFTs</span>
            <Badge className="bg-purple-500/20 text-purple-400 text-xs">
              {nfts.length} NFTs
            </Badge>
          </div>
          {expandedSections.has('nfts') ? (
            <ChevronUp className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          )}
        </button>

        {expandedSections.has('nfts') && (
          <div className="border-t border-purple-500/20 p-4">
            {nftsLoading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="w-6 h-6 text-purple-400 animate-spin" />
                <span className="ml-2 text-gray-400">Loading NFTs...</span>
              </div>
            ) : nftsError ? (
              <div className="text-center py-8 text-red-400">
                <p>Error loading NFTs: {nftsError}</p>
                <button
                  onClick={refetchNFTs}
                  className="mt-2 text-sm text-cyan-400 hover:underline"
                >
                  Try again
                </button>
              </div>
            ) : nfts.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No SoundChain NFTs found on Polygon</p>
                <p className="text-xs mt-1">Legacy NFTs from 2022-2024 will appear here</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2">
                {nfts.map((nft) => (
                  <NFTCard
                    key={`${nft.contractAddress}-${nft.tokenId}`}
                    nft={nft}
                    onPlay={() => onPlayTrack?.(nft)}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </Card>

      {/* ZetaChain Omnichain Status */}
      <Card className="retro-card p-4 border-green-500/30 bg-green-900/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
            <span className="text-xl">ζ</span>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-bold text-white">ZetaChain Omnichain</span>
              <Badge className="bg-green-500/20 text-green-400 text-xs">Ready</Badge>
            </div>
            <p className="text-xs text-gray-500">Cross-chain transactions enabled</p>
          </div>
          <a
            href="https://explorer.zetachain.com"
            target="_blank"
            rel="noreferrer"
            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
          >
            <ExternalLink className="w-4 h-4 text-green-400" />
          </a>
        </div>
      </Card>
    </div>
  )
}

// Chain Balance Row Component
function ChainBalanceRow({
  balance,
  isSelected,
  onSelect
}: {
  balance: ChainBalance
  isSelected: boolean
  onSelect: () => void
}) {
  const chain = CHAINS[balance.chainId]
  const hasBalance = parseFloat(balance.nativeBalance) > 0 || parseFloat(balance.ogunBalance) > 0

  return (
    <button
      onClick={onSelect}
      className={`w-full p-3 rounded-lg flex items-center justify-between transition-all ${
        isSelected
          ? 'bg-cyan-500/20 border border-cyan-500/50'
          : hasBalance
            ? 'bg-white/5 hover:bg-white/10 border border-transparent'
            : 'bg-black/20 border border-transparent opacity-50'
      }`}
    >
      <div className="flex items-center gap-3">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: `${balance.color}20` }}
        >
          <span className="text-lg">{balance.icon}</span>
        </div>
        <div className="text-left">
          <p className="font-medium text-white text-sm">{balance.chainName}</p>
          {balance.error && (
            <p className="text-xs text-red-400">{balance.error}</p>
          )}
        </div>
      </div>
      <div className="text-right">
        <p className="text-white font-mono text-sm">
          {balance.nativeBalance} {balance.nativeSymbol}
        </p>
        {parseFloat(balance.ogunBalance) > 0 && (
          <p className="text-xs text-purple-400">{balance.ogunBalance} OGUN</p>
        )}
      </div>
    </button>
  )
}

// NFT Card Component
function NFTCard({
  nft,
  onPlay
}: {
  nft: PolygonNFT
  onPlay: () => void
}) {
  const [imageError, setImageError] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const defaultImage = '/default-pictures/album-artwork.png'

  const displayImage = imageError ? defaultImage : (nft.image || defaultImage)

  return (
    <div
      className="relative aspect-square rounded-lg overflow-hidden cursor-pointer transition-all hover:scale-105 group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onPlay}
    >
      <img
        src={displayImage}
        alt={nft.name || 'NFT'}
        className="w-full h-full object-cover"
        onError={() => setImageError(true)}
      />

      {/* Hover overlay */}
      {isHovered && (
        <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center p-2">
          {nft.audioUrl && (
            <button className="w-10 h-10 rounded-full bg-cyan-500 hover:bg-cyan-400 flex items-center justify-center mb-2">
              <span className="text-black ml-0.5">▶</span>
            </button>
          )}
          <p className="text-white text-xs font-medium text-center truncate w-full">
            {nft.name}
          </p>
          {nft.artist && (
            <p className="text-gray-400 text-[10px] truncate w-full text-center">
              {nft.artist}
            </p>
          )}
        </div>
      )}

      {/* Chain badge */}
      <div className="absolute top-1 right-1">
        <div
          className="w-5 h-5 rounded-full flex items-center justify-center text-xs"
          style={{ backgroundColor: CHAINS.polygon.color + '40' }}
        >
          ⬡
        </div>
      </div>
    </div>
  )
}

export default OmnichainWalletDashboard
