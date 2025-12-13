import React, { useEffect, useRef } from 'react'
import jazzicon from '@metamask/jazzicon'

interface GuestAvatarProps {
  walletAddress: string
  pixels?: number
  className?: string
}

/**
 * Generates a unique avatar from a wallet address using MetaMask's jazzicon.
 * Used for guest users who interact without a SoundChain account.
 */
export const GuestAvatar = ({ walletAddress, pixels = 30, className = '' }: GuestAvatarProps) => {
  const avatarRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (avatarRef.current && walletAddress) {
      // Clear previous content
      avatarRef.current.innerHTML = ''

      // Generate jazzicon from wallet address
      // Convert address to a numeric seed by parsing hex
      const seed = parseInt(walletAddress.slice(2, 10), 16)
      const icon = jazzicon(pixels, seed)

      avatarRef.current.appendChild(icon)
    }
  }, [walletAddress, pixels])

  return (
    <div
      ref={avatarRef}
      className={`flex-shrink-0 rounded-full overflow-hidden ${className}`}
      style={{ width: pixels, height: pixels }}
      title={`Guest: ${formatWalletAddress(walletAddress)}`}
    />
  )
}

/**
 * Formats a wallet address for display (0x1234...5678)
 */
export const formatWalletAddress = (address: string): string => {
  if (!address || address.length < 10) return address
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}
