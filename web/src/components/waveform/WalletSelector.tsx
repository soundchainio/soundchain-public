import classNames from 'classnames'
import { Matic } from 'components/Matic'
import { Logo } from 'icons/Logo'
import { MetaMask } from 'icons/MetaMask'
import { useUnifiedWallet } from 'contexts/UnifiedWalletContext'
import { Ogun } from '../Ogun'

interface WalletSelectorProps {
  className?: string | undefined
  ownerAddressAccount?: string
  showOgun?: boolean
}

export const WalletSelector = ({ className, ownerAddressAccount, showOgun = false }: WalletSelectorProps) => {
  const {
    activeWalletType,
    activeAddress,
    activeBalance,
    activeOgunBalance,
    isConnected,
    chainName,
    connectWeb3Modal,
    switchToMagic,
    disconnectWallet,
  } = useUnifiedWallet()

  // Get display info based on wallet type
  const getWalletIcon = () => {
    switch (activeWalletType) {
      case 'magic':
        return <Logo id="soundchain-wallet" height="16" width="16" />
      case 'metamask':
        return <MetaMask height="16" width="16" />
      case 'web3modal':
        return <span className="text-sm">🔗</span>
      default:
        return <Logo id="soundchain-wallet" height="16" width="16" />
    }
  }

  const getWalletName = () => {
    switch (activeWalletType) {
      case 'magic':
        return 'SoundChain'
      case 'metamask':
        return 'MetaMask'
      case 'web3modal':
        return chainName || 'External'
      default:
        return 'Not Connected'
    }
  }

  const truncateAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`
  }

  return (
    <div className={classNames('bg-gray-20', className)}>
      <div className="color flex w-full items-center justify-between p-4">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 text-xs font-bold text-white">WALLET</div>

          {/* Balance Display */}
          <div className="flex flex-row items-center gap-1 text-xxs font-black text-gray-80">
            <span>Balance:</span>
            <div>
              <Matic value={activeBalance || 0} />
              {showOgun && <Ogun value={activeOgunBalance} className="sm:ml-2" />}
            </div>
          </div>

          {/* Connected Address */}
          {isConnected && activeAddress && (
            <div className="flex items-center gap-1 text-xxs">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              <span className="text-cyan-400 font-mono">{truncateAddress(activeAddress)}</span>
              {chainName && <span className="text-gray-500">({chainName})</span>}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Current Wallet Display */}
          {isConnected ? (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-25 rounded-lg border border-gray-30">
              <span className="flex items-center justify-center w-4 h-4">
                {getWalletIcon()}
              </span>
              <span className="text-xs font-bold text-white">{getWalletName()}</span>
            </div>
          ) : (
            <button
              type="button"
              onClick={switchToMagic}
              className="flex items-center gap-2 px-3 py-1.5 bg-gray-25 rounded-lg border border-gray-30 hover:border-cyan-500/50 transition-colors"
            >
              <Logo id="soundchain-wallet" height="16" width="16" />
              <span className="text-xs font-bold text-gray-60">Use SoundChain</span>
            </button>
          )}

          {/* Connect External Wallet Button */}
          <button
            type="button"
            onClick={connectWeb3Modal}
            className="flex items-center gap-1 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-lg transition-colors"
          >
            <span>🔗</span>
            <span className="hidden sm:inline">
              {isConnected && activeWalletType === 'web3modal' ? 'Switch' : 'Connect'}
            </span>
          </button>

          {/* Disconnect Button (only show if connected via external wallet) */}
          {isConnected && activeWalletType === 'web3modal' && (
            <button
              type="button"
              onClick={disconnectWallet}
              className="flex items-center gap-1 px-2 py-1.5 bg-red-600/20 hover:bg-red-600/40 text-red-400 text-xs font-bold rounded-lg transition-colors"
              title="Disconnect Wallet"
            >
              <span>✕</span>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
