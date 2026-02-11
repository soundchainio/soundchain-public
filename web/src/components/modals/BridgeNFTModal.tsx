/**
 * Bridge NFT Modal
 * Allows users to transfer NFTs across chains via ZetaChain
 * Integrates with NFT Bridge contract
 */

import React, { useState } from 'react'
import { X, ArrowRight, ExternalLink, AlertTriangle, Check, Loader2 } from 'lucide-react'
import classNames from 'classnames'
import { L2_CONTRACTS, SUPPORTED_BRIDGE_CHAINS, BridgeChain } from 'constants/l2Contracts'

interface BridgeNFTModalProps {
  isOpen: boolean
  onClose: () => void
  nft: {
    tokenId: string
    title: string
    imageUrl?: string
    editionId?: string
  }
  currentChain?: number // Default to Polygon (137)
}

type BridgeStatus = 'idle' | 'confirming' | 'bridging' | 'success' | 'error'

export const BridgeNFTModal: React.FC<BridgeNFTModalProps> = ({
  isOpen,
  onClose,
  nft,
  currentChain = 137,
}) => {
  const [targetChain, setTargetChain] = useState<BridgeChain | null>(null)
  const [recipientOverride, setRecipientOverride] = useState('')
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [status, setStatus] = useState<BridgeStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const [txHash, setTxHash] = useState<string | null>(null)

  const handleBridge = async () => {
    if (!targetChain) return

    setStatus('confirming')
    setError(null)

    try {
      // TODO: Integrate with NFT Bridge contract
      // 1. Approve NFT for bridge contract
      // 2. Call bridge.initiateTransfer(tokenId, targetChainId, recipient)
      // 3. Track bridge status via ZetaChain

      console.log('Bridging NFT:', nft.tokenId, 'to chain:', targetChain.id)

      // Simulate bridging for now
      await new Promise(resolve => setTimeout(resolve, 1500))
      setStatus('bridging')
      await new Promise(resolve => setTimeout(resolve, 2500))

      setTxHash('0x' + Math.random().toString(16).slice(2, 66))
      setStatus('success')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bridge failed')
      setStatus('error')
    }
  }

  const resetModal = () => {
    setTargetChain(null)
    setStatus('idle')
    setError(null)
    setTxHash(null)
    setShowAdvanced(false)
    setRecipientOverride('')
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={status === 'idle' ? onClose : undefined}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md bg-neutral-900 rounded-2xl border border-white/10 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h2 className="text-white font-bold">Bridge NFT</h2>
          <button
            onClick={() => { resetModal(); onClose(); }}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {status === 'success' ? (
            // Success State
            <div className="text-center py-6">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center">
                <Check className="w-8 h-8 text-green-400" />
              </div>
              <h3 className="text-white font-bold text-lg mb-2">Bridge Initiated!</h3>
              <p className="text-gray-400 text-sm mb-4">
                Your NFT is being transferred to {targetChain?.name}.
                This usually takes 5-15 minutes.
              </p>
              {txHash && (
                <a
                  href={`https://polygonscan.com/tx/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-cyan-400 text-sm hover:underline"
                >
                  View Transaction <ExternalLink className="w-3 h-3" />
                </a>
              )}
              <button
                onClick={() => { resetModal(); onClose(); }}
                className="w-full mt-6 py-3 rounded-xl bg-white/10 text-white font-medium hover:bg-white/20 transition-colors"
              >
                Done
              </button>
            </div>
          ) : (
            <>
              {/* NFT Preview */}
              <div className="flex items-center gap-3 p-3 rounded-xl bg-black/40 mb-4">
                {nft.imageUrl ? (
                  <img
                    src={nft.imageUrl}
                    alt={nft.title}
                    className="w-12 h-12 rounded-lg object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium truncate">{nft.title}</p>
                  <p className="text-gray-400 text-sm">Token #{nft.tokenId}</p>
                </div>
              </div>

              {/* Chain Flow */}
              <div className="flex items-center justify-center gap-3 mb-4">
                <div className="px-4 py-2 rounded-xl bg-purple-500/20 border border-purple-500/30">
                  <span className="text-purple-400 font-medium">⬡ Polygon</span>
                </div>
                <ArrowRight className="w-5 h-5 text-gray-500" />
                <div className={classNames(
                  'px-4 py-2 rounded-xl border',
                  targetChain
                    ? 'bg-cyan-500/20 border-cyan-500/30'
                    : 'bg-black/40 border-white/10'
                )}>
                  <span className={targetChain ? 'text-cyan-400 font-medium' : 'text-gray-500'}>
                    {targetChain ? `${targetChain.icon} ${targetChain.name}` : 'Select Chain'}
                  </span>
                </div>
              </div>

              {/* Chain Selector */}
              <div className="mb-4">
                <label className="block text-gray-400 text-sm mb-2">Destination Chain</label>
                <div className="grid grid-cols-2 gap-2">
                  {SUPPORTED_BRIDGE_CHAINS.map(chain => (
                    <button
                      key={chain.id}
                      onClick={() => setTargetChain(chain)}
                      disabled={status !== 'idle'}
                      className={classNames(
                        'p-3 rounded-xl border text-left transition-all',
                        targetChain?.id === chain.id
                          ? 'bg-cyan-500/20 border-cyan-500/50'
                          : 'bg-black/40 border-white/10 hover:border-white/30',
                        status !== 'idle' && 'opacity-50 cursor-not-allowed'
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{chain.icon}</span>
                        <span className="text-white font-medium">{chain.name}</span>
                      </div>
                      <p className="text-gray-500 text-xs mt-1">Gas: {chain.symbol}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Advanced Options */}
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="text-gray-400 text-sm hover:text-white mb-2"
              >
                {showAdvanced ? '▼' : '▶'} Advanced Options
              </button>

              {showAdvanced && (
                <div className="mb-4">
                  <label className="block text-gray-400 text-sm mb-1">
                    Recipient Override (optional)
                  </label>
                  <input
                    type="text"
                    placeholder="0x... (defaults to your wallet)"
                    value={recipientOverride}
                    onChange={(e) => setRecipientOverride(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-white text-sm placeholder-gray-500 focus:border-cyan-500 focus:outline-none"
                  />
                </div>
              )}

              {/* Warning */}
              <div className="p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20 mb-4">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-yellow-400 mt-0.5" />
                  <div>
                    <p className="text-yellow-400 text-sm font-medium">Cross-Chain Transfer</p>
                    <p className="text-gray-400 text-xs">
                      NFT will be locked on Polygon and minted on {targetChain?.name || 'destination'}.
                      Bridge time: ~5-15 minutes.
                    </p>
                  </div>
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 mb-4">
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {status !== 'success' && (
          <div className="p-4 border-t border-white/10">
            <button
              onClick={handleBridge}
              disabled={!targetChain || status !== 'idle'}
              className={classNames(
                'w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2',
                targetChain && status === 'idle'
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white hover:from-cyan-600 hover:to-blue-600'
                  : 'bg-gray-700 text-gray-400 cursor-not-allowed'
              )}
            >
              {status === 'confirming' && (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Confirm in Wallet...
                </>
              )}
              {status === 'bridging' && (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Bridging...
                </>
              )}
              {status === 'idle' && (
                targetChain ? `Bridge to ${targetChain.name}` : 'Select Destination Chain'
              )}
            </button>

            {/* Contract Link */}
            <a
              href={`https://polygonscan.com/address/${L2_CONTRACTS.NFT_BRIDGE}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 flex items-center justify-center gap-1 text-gray-500 text-xs hover:text-gray-400"
            >
              <span>Bridge Contract: {L2_CONTRACTS.NFT_BRIDGE.slice(0, 10)}...</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        )}
      </div>
    </div>
  )
}

export default BridgeNFTModal
