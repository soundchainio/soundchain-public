/**
 * ChainSwitcher - EVM Network Selector for Multi-Chain Balance Viewing
 *
 * Allows users to switch between EVM networks to view balances.
 * Note: OGUN is only available on Polygon (chain 137).
 */

import React, { useState, useRef, useEffect } from 'react'
import { Badge } from '../ui/badge'
import { ChevronDown, AlertCircle, Loader2 } from 'lucide-react'
import { useMultiChain } from 'contexts/MultiChainContext'
import { BlockchainNetwork } from 'lib/blockchainNetworks'

interface ChainSwitcherProps {
  /** Compact mode for header/navbar */
  compact?: boolean
  /** Show balance alongside chain name */
  showBalance?: boolean
  /** Additional className */
  className?: string
}

// Chain icons - using emoji for now, could be replaced with SVG icons
const getChainIcon = (chainId: number): string => {
  switch (chainId) {
    case 137: return '🟣' // Polygon
    case 1: return '🔷' // Ethereum
    case 8453: return '🔵' // Base
    case 42161: return '🔶' // Arbitrum
    case 10: return '🔴' // Optimism
    default: return '⚪'
  }
}

// Chain colors for styling
const getChainColor = (chainId: number): string => {
  switch (chainId) {
    case 137: return 'purple'
    case 1: return 'blue'
    case 8453: return 'blue'
    case 42161: return 'orange'
    case 10: return 'red'
    default: return 'gray'
  }
}

export function ChainSwitcher({ compact = false, showBalance = true, className = '' }: ChainSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const {
    selectedChainId,
    selectedNetwork,
    availableNetworks,
    switchViewingChain,
    selectedChainBalance,
    isLoadingBalance,
    allChainBalances,
    isOgunAvailableOnSelectedChain,
  } = useMultiChain()

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Close dropdown on escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [])

  const handleSelectChain = (chainId: number) => {
    switchViewingChain(chainId)
    setIsOpen(false)
  }

  const getBalanceForChain = (chainId: number): string | null => {
    const chainBalance = allChainBalances.find(b => b.chainId === chainId)
    return chainBalance?.balance || null
  }

  if (compact) {
    return (
      <div className={`relative ${className}`} ref={dropdownRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-black/40 border border-cyan-500/20 hover:border-cyan-500/40 transition-colors"
        >
          <span className="text-sm">{getChainIcon(selectedChainId)}</span>
          <span className="text-xs text-gray-300 hidden sm:inline">{selectedNetwork.name}</span>
          <ChevronDown className={`w-3 h-3 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {isOpen && (
          <div className="absolute top-full right-0 mt-1 w-48 bg-[#0a0a0a] border border-cyan-500/30 rounded-lg shadow-xl z-50 overflow-hidden">
            {availableNetworks.map((network) => (
              <ChainOption
                key={network.id}
                network={network}
                isSelected={network.id === selectedChainId}
                balance={getBalanceForChain(network.id)}
                showBalance={showBalance}
                onClick={() => handleSelectChain(network.id)}
              />
            ))}
          </div>
        )}
      </div>
    )
  }

  // Full mode - for wallet panel
  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Selected Chain Display */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-3 rounded-lg bg-black/40 border border-cyan-500/20 hover:border-cyan-500/40 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center bg-${getChainColor(selectedChainId)}-500/20 border border-${getChainColor(selectedChainId)}-500/30`}>
            <span className="text-xl">{getChainIcon(selectedChainId)}</span>
          </div>
          <div className="text-left">
            <div className="text-white font-semibold">{selectedNetwork.name}</div>
            <div className="text-xs text-gray-400">
              {isLoadingBalance ? (
                <span className="flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Loading...
                </span>
              ) : (
                `${selectedChainBalance || '0'} ${selectedNetwork.symbol}`
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!isOgunAvailableOnSelectedChain && (
            <Badge className="bg-yellow-500/20 text-yellow-400 text-[10px]">
              No OGUN
            </Badge>
          )}
          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {/* OGUN Warning */}
      {!isOgunAvailableOnSelectedChain && (
        <div className="mt-2 p-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-yellow-300">
            OGUN is only available on Polygon. Switch to Polygon to view your OGUN balance and use staking features.
          </div>
        </div>
      )}

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-[#0a0a0a] border border-cyan-500/30 rounded-lg shadow-xl z-50 overflow-hidden">
          <div className="p-2 border-b border-cyan-500/20">
            <span className="text-xs text-gray-500 uppercase tracking-wider">Select Network</span>
          </div>
          {availableNetworks.map((network) => (
            <ChainOption
              key={network.id}
              network={network}
              isSelected={network.id === selectedChainId}
              balance={getBalanceForChain(network.id)}
              showBalance={showBalance}
              onClick={() => handleSelectChain(network.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// Chain option component
function ChainOption({
  network,
  isSelected,
  balance,
  showBalance,
  onClick,
}: {
  network: BlockchainNetwork
  isSelected: boolean
  balance: string | null
  showBalance: boolean
  onClick: () => void
}) {
  const isPolygon = network.id === 137

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center justify-between p-3 hover:bg-white/5 transition-colors ${
        isSelected ? 'bg-cyan-500/10' : ''
      }`}
    >
      <div className="flex items-center gap-3">
        <span className="text-lg">{getChainIcon(network.id)}</span>
        <div className="text-left">
          <div className={`text-sm ${isSelected ? 'text-cyan-400' : 'text-white'}`}>
            {network.name}
          </div>
          {showBalance && balance && (
            <div className="text-xs text-gray-500">
              {balance} {network.symbol}
            </div>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {isPolygon && (
          <Badge className="bg-purple-500/20 text-purple-400 text-[10px]">
            OGUN
          </Badge>
        )}
        {isSelected && (
          <div className="w-2 h-2 rounded-full bg-cyan-400" />
        )}
      </div>
    </button>
  )
}

export default ChainSwitcher
