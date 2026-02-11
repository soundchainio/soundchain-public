/**
 * Verified On-Chain Badge
 * Shows when a track's SCid is registered on the SCid Registry contract
 */

import React from 'react'
import { CheckCircle, ExternalLink } from 'lucide-react'
import classNames from 'classnames'

interface BadgeVerifiedOnChainProps {
  scid?: string
  txHash?: string
  className?: string
  compact?: boolean
}

export const BadgeVerifiedOnChain: React.FC<BadgeVerifiedOnChainProps> = ({
  scid,
  txHash,
  className,
  compact = false,
}) => {
  if (!scid) return null

  const polygonscanUrl = txHash
    ? `https://polygonscan.com/tx/${txHash}`
    : `https://polygonscan.com/address/0x823F90438f262A70D74c6D4e782677256f39150a`

  if (compact) {
    return (
      <a
        href={polygonscanUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={classNames(
          'inline-flex items-center gap-1 px-2 py-0.5 rounded-full',
          'bg-gradient-to-r from-green-600/20 to-cyan-600/20',
          'border border-green-500/30',
          'text-green-400 text-xs font-medium',
          'hover:from-green-600/30 hover:to-cyan-600/30 transition-all',
          className
        )}
        title={`Verified: ${scid}`}
      >
        <CheckCircle className="w-3 h-3" />
        <span>On-Chain</span>
      </a>
    )
  }

  return (
    <a
      href={polygonscanUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={classNames(
        'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full',
        'bg-gradient-to-r from-green-600 to-cyan-600',
        'text-white text-xs font-bold',
        'hover:from-green-500 hover:to-cyan-500 transition-all',
        'shadow-lg shadow-green-500/20',
        className
      )}
    >
      <CheckCircle className="w-4 h-4" />
      <span>Verified On-Chain</span>
      <ExternalLink className="w-3 h-3 opacity-70" />
    </a>
  )
}

export default BadgeVerifiedOnChain
