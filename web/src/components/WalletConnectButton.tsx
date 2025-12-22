'use client'

import { useWeb3Modal, useWeb3ModalAccount, useDisconnect } from '@web3modal/ethers5/react'
import classNames from 'classnames'

interface WalletConnectButtonProps {
  className?: string
  variant?: 'default' | 'compact' | 'icon'
  showAddress?: boolean
}

export const WalletConnectButton = ({
  className,
  variant = 'default',
  showAddress = true
}: WalletConnectButtonProps) => {
  const { open } = useWeb3Modal()
  const { address, isConnected } = useWeb3ModalAccount()
  const { disconnect } = useDisconnect()

  const truncateAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`
  }

  if (isConnected && address) {
    return (
      <div className={classNames('flex items-center gap-2', className)}>
        {showAddress && variant !== 'icon' && (
          <span className="text-xs text-gray-60">
            {truncateAddress(address)}
          </span>
        )}
        <button
          onClick={() => open({ view: 'Account' })}
          className={classNames(
            'flex items-center justify-center rounded-lg bg-gray-20 border border-gray-30 hover:bg-gray-25 transition-colors',
            {
              'px-4 py-2 gap-2': variant === 'default',
              'px-3 py-1.5 gap-1.5 text-xs': variant === 'compact',
              'p-2': variant === 'icon',
            }
          )}
        >
          <div className="w-2 h-2 rounded-full bg-green-500" />
          {variant !== 'icon' && (
            <span className="text-white text-sm font-medium">Connected</span>
          )}
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={() => open()}
      className={classNames(
        'flex items-center justify-center rounded-lg bg-purple-600 hover:bg-purple-700 transition-colors text-white font-medium',
        {
          'px-4 py-2 gap-2': variant === 'default',
          'px-3 py-1.5 gap-1.5 text-xs': variant === 'compact',
          'p-2': variant === 'icon',
        },
        className
      )}
    >
      <WalletIcon className="w-4 h-4" />
      {variant !== 'icon' && <span>Connect Wallet</span>}
    </button>
  )
}

// Simple wallet icon
const WalletIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M21 18V19C21 20.1 20.1 21 19 21H5C3.89 21 3 20.1 3 19V5C3 3.9 3.89 3 5 3H19C20.1 3 21 3.9 21 5V6H12C10.89 6 10 6.9 10 8V16C10 17.1 10.89 18 12 18H21ZM12 16H22V8H12V16ZM16 13.5C15.17 13.5 14.5 12.83 14.5 12C14.5 11.17 15.17 10.5 16 10.5C16.83 10.5 17.5 11.17 17.5 12C17.5 12.83 16.83 13.5 16 13.5Z" fill="currentColor"/>
  </svg>
)

export default WalletConnectButton
