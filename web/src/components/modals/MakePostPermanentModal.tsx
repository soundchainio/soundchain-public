import { useState, useMemo, useEffect } from 'react'
import { X, Lock, Coins, AlertCircle, CheckCircle, Loader2, Wallet } from 'lucide-react'
import { config } from '../../config'
import { useMagicContext } from 'hooks/useMagicContext'
import { useUnifiedWallet } from 'contexts/UnifiedWalletContext'
import { useMetaMask } from 'hooks/useMetaMask'
import { useMutation } from '@apollo/client'
import { MAKE_POST_PERMANENT_MUTATION } from 'lib/graphql/mutations'
import { useMeQuery } from 'lib/graphql'
import Web3 from 'web3'
import { toast } from 'react-toastify'

// OGUN Token ABI (just transfer function)
const OGUN_ABI = [
  {
    inputs: [
      { name: 'recipient', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    name: 'transfer',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
]

interface MakePostPermanentModalProps {
  isOpen: boolean
  onClose: () => void
  postId: string
  mediaSize?: number // bytes
  onSuccess?: () => void
}

type PaymentToken = 'OGUN' | 'POL'

export const MakePostPermanentModal = ({
  isOpen,
  onClose,
  postId,
  mediaSize = 0,
  onSuccess,
}: MakePostPermanentModalProps) => {
  const [paymentToken, setPaymentToken] = useState<PaymentToken>('OGUN')
  const [isProcessing, setIsProcessing] = useState(false)
  const [step, setStep] = useState<'confirm' | 'fee' | 'payment' | 'complete'>('confirm')

  // Get user's stored wallet addresses (for wallet-only users)
  const { data: userData } = useMeQuery({ skip: !isOpen })
  const storedWalletAddresses = userData?.me?.metaMaskWalletAddressees || []
  const isWalletOnlyUser = storedWalletAddresses.length > 0 && !userData?.me?.magicWalletAddress && !userData?.me?.googleWalletAddress && !userData?.me?.discordWalletAddress && !userData?.me?.twitchWalletAddress

  // Multi-wallet support
  const { web3: magicWeb3, account: magicAccount, ogunBalance: magicOgunBalance, balance: magicPolBalance } = useMagicContext()
  const { web3: metamaskWeb3, account: metamaskAccount, connect: connectMetaMask, OGUNBalance: metamaskOgunBalance, balance: metamaskPolBalance } = useMetaMask()
  const {
    activeWalletType,
    activeAddress,
    web3: unifiedWeb3,
    ogunBalance: unifiedOgunBalance,
    polBalance: unifiedPolBalance,
    connectWeb3Modal,
    isWeb3ModalReady,
  } = useUnifiedWallet()

  // Track selected wallet for payment
  const [selectedWallet, setSelectedWallet] = useState<'magic' | 'metamask' | 'web3modal' | null>(null)

  // Build list of available wallets with balances
  const availableWallets = useMemo(() => {
    const wallets: Array<{
      type: 'magic' | 'metamask' | 'web3modal'
      address: string
      label: string
      ogunBalance: string
      polBalance: string
      web3: Web3 | null
    }> = []

    if (magicAccount && magicWeb3) {
      wallets.push({
        type: 'magic',
        address: magicAccount,
        label: 'Magic Wallet',
        ogunBalance: magicOgunBalance || '0',
        polBalance: magicPolBalance || '0',
        web3: magicWeb3,
      })
    }

    if (metamaskAccount && metamaskWeb3) {
      wallets.push({
        type: 'metamask',
        address: metamaskAccount,
        label: 'MetaMask',
        ogunBalance: metamaskOgunBalance || '0',
        polBalance: metamaskPolBalance || '0',
        web3: metamaskWeb3,
      })
    }

    if (activeWalletType === 'web3modal' && activeAddress && unifiedWeb3) {
      wallets.push({
        type: 'web3modal',
        address: activeAddress,
        label: 'WalletConnect',
        ogunBalance: unifiedOgunBalance || '0',
        polBalance: unifiedPolBalance || '0',
        web3: unifiedWeb3,
      })
    }

    return wallets
  }, [magicAccount, magicWeb3, magicOgunBalance, magicPolBalance, metamaskAccount, metamaskWeb3, metamaskOgunBalance, metamaskPolBalance, activeWalletType, activeAddress, unifiedWeb3, unifiedOgunBalance, unifiedPolBalance])

  // Auto-select first wallet with sufficient balance, or first wallet if none have enough
  useEffect(() => {
    if (availableWallets.length > 0 && !selectedWallet) {
      const walletWithBalance = availableWallets.find(w => {
        const balance = paymentToken === 'OGUN' ? parseFloat(w.ogunBalance) : parseFloat(w.polBalance)
        return balance >= pricing.total
      })
      setSelectedWallet(walletWithBalance?.type || availableWallets[0].type)
    }
  }, [availableWallets.length]) // Only run when wallets change, not on every render

  // Get currently selected wallet
  const currentWallet = useMemo(() => {
    return availableWallets.find(w => w.type === selectedWallet) || availableWallets[0] || null
  }, [availableWallets, selectedWallet])

  // Determine active wallet and web3 instance
  const hasExternalWallet = !!metamaskAccount || activeWalletType === 'web3modal' || activeWalletType === 'direct'
  const hasMagicWallet = !!magicAccount
  const hasAnyWallet = availableWallets.length > 0

  // Select web3 instance based on selected wallet
  const web3 = currentWallet?.web3 || unifiedWeb3 || metamaskWeb3 || magicWeb3
  const connectedAccount = currentWallet?.address || activeAddress || metamaskAccount || magicAccount
  const ogunBalance = currentWallet?.ogunBalance || unifiedOgunBalance || '0'
  const polBalance = currentWallet?.polBalance || unifiedPolBalance || '0'

  const [makePostPermanent] = useMutation(MAKE_POST_PERMANENT_MUTATION, {
    refetchQueries: ['Posts', 'Feed', 'Post'],
  })

  // Calculate pricing based on media size
  const pricing = useMemo(() => {
    const { tiers, platformFeeRate } = config.permanentPostPricing
    // Find the appropriate tier
    let tier = tiers[0] // Default to text-only
    for (let i = tiers.length - 1; i >= 0; i--) {
      if (mediaSize > tiers[i].maxSizeBytes) {
        tier = tiers[i + 1] || tiers[tiers.length - 1]
        break
      }
      if (mediaSize <= tiers[i].maxSizeBytes) {
        tier = tiers[i]
      }
    }

    const basePrice = paymentToken === 'OGUN' ? tier.ogun : tier.pol
    const platformFee = basePrice * platformFeeRate
    const total = basePrice + platformFee

    return {
      tier,
      basePrice,
      platformFee,
      total,
    }
  }, [mediaSize, paymentToken])

  // Check if user has enough balance
  const hasEnoughBalance = useMemo(() => {
    const balance = paymentToken === 'OGUN' ? parseFloat(ogunBalance || '0') : parseFloat(polBalance || '0')
    return balance >= pricing.total
  }, [paymentToken, ogunBalance, polBalance, pricing.total])

  const handleMakePermanent = async () => {
    if (!web3 || !connectedAccount) {
      toast.error('Please connect your wallet')
      return
    }

    if (!hasEnoughBalance) {
      toast.error(`Insufficient ${paymentToken} balance`)
      return
    }

    setIsProcessing(true)
    setStep('fee')

    try {
      const treasuryAddress = config.treasuryAddress
      let txHash: string

      if (paymentToken === 'POL') {
        // Send POL directly
        setStep('payment')
        const amountWei = web3.utils.toWei(pricing.total.toString(), 'ether')
        const tx = await web3.eth.sendTransaction({
          from: connectedAccount,
          to: treasuryAddress,
          value: amountWei,
        })
        txHash = tx.transactionHash
      } else {
        // Send OGUN tokens
        setStep('payment')
        const ogunContract = new web3.eth.Contract(OGUN_ABI as any, config.ogunTokenAddress)
        const amountWei = web3.utils.toWei(pricing.total.toString(), 'ether')
        const tx = await ogunContract.methods.transfer(treasuryAddress, amountWei).send({
          from: connectedAccount,
        })
        txHash = tx.transactionHash
      }

      // Call the GraphQL mutation
      const result = await makePostPermanent({
        variables: {
          input: {
            postId,
            paymentToken,
            transactionHash: txHash,
            amountPaid: pricing.total,
          },
        },
      })

      if (result.data?.makePostPermanent?.success) {
        setStep('complete')
        toast.success('Post is now permanent!')
        setTimeout(() => {
          onSuccess?.()
          onClose()
        }, 1500)
      } else {
        throw new Error(result.data?.makePostPermanent?.error || 'Failed to make post permanent')
      }
    } catch (error: any) {
      console.error('Make permanent error:', error)
      toast.error(error?.message || 'Transaction failed')
      setStep('confirm')
    } finally {
      setIsProcessing(false)
    }
  }

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed z-50 bottom-0 left-0 right-0 sm:bottom-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:max-w-md sm:w-full animate-in slide-in-from-bottom sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200">
        <div className="bg-neutral-900 border border-neutral-700 rounded-t-2xl sm:rounded-2xl overflow-hidden shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-800">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-amber-400" />
              <span className="text-white font-medium text-sm">Make Post Permanent</span>
            </div>
            <button
              onClick={onClose}
              disabled={isProcessing}
              className="p-1 rounded-full hover:bg-neutral-800 transition-colors disabled:opacity-50"
            >
              <X className="w-4 h-4 text-neutral-400" />
            </button>
          </div>

          {/* Content */}
          <div className="p-4">
            {step === 'confirm' && (
              <>
                {/* Explanation */}
                <p className="text-neutral-400 text-sm mb-4">
                  Convert your 24-hour ephemeral post to a permanent post that never expires.
                </p>

                {/* Wallet Connection Section */}
                {!hasAnyWallet && (
                  <div className="mb-4 p-4 bg-neutral-800/70 rounded-xl border border-neutral-700">
                    <div className="flex items-center gap-2 mb-3">
                      <Wallet className="w-4 h-4 text-amber-400" />
                      <span className="text-white font-medium text-sm">
                        {isWalletOnlyUser ? 'Reconnect Your Wallet' : 'Connect Wallet'}
                      </span>
                    </div>
                    {isWalletOnlyUser && storedWalletAddresses.length > 0 && (
                      <div className="mb-3 p-2 bg-cyan-500/10 border border-cyan-500/30 rounded-lg">
                        <p className="text-cyan-400 text-xs mb-1">Your registered wallet:</p>
                        <p className="text-cyan-300 text-xs font-mono">
                          {storedWalletAddresses[0]}
                        </p>
                      </div>
                    )}
                    <p className="text-neutral-400 text-xs mb-3">
                      {isWalletOnlyUser
                        ? 'Reconnect your wallet to make blockchain transactions.'
                        : 'Connect a wallet to pay for making this post permanent.'}
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={connectMetaMask}
                        className="py-2.5 px-3 bg-orange-500/20 border border-orange-500/50 hover:border-orange-400 rounded-lg text-orange-400 text-xs font-medium transition-all flex items-center justify-center gap-2"
                      >
                        <span>MetaMask</span>
                      </button>
                      <button
                        onClick={() => isWeb3ModalReady && connectWeb3Modal()}
                        disabled={!isWeb3ModalReady}
                        className={`py-2.5 px-3 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-2 ${
                          isWeb3ModalReady
                            ? 'bg-purple-500/20 border border-purple-500/50 hover:border-purple-400 text-purple-400'
                            : 'bg-neutral-700 text-neutral-500 cursor-wait'
                        }`}
                      >
                        <span>{isWeb3ModalReady ? 'WalletConnect' : 'Loading...'}</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Wallet Selector */}
                {availableWallets.length > 0 && (
                  <div className="mb-4">
                    <label className="text-neutral-500 text-xs uppercase tracking-wide mb-2 block">
                      Pay from wallet
                    </label>
                    <div className="space-y-2">
                      {availableWallets.map((wallet) => {
                        const isSelected = selectedWallet === wallet.type
                        const walletBalance = paymentToken === 'OGUN' ? parseFloat(wallet.ogunBalance) : parseFloat(wallet.polBalance)
                        const hasSufficientBalance = walletBalance >= pricing.total
                        return (
                          <button
                            key={wallet.type}
                            onClick={() => setSelectedWallet(wallet.type)}
                            className={`w-full p-3 rounded-xl border transition-all text-left ${
                              isSelected
                                ? 'bg-green-500/10 border-green-500/50'
                                : 'bg-neutral-800/50 border-neutral-700 hover:border-neutral-600'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${isSelected ? 'bg-green-400 animate-pulse' : 'bg-neutral-600'}`} />
                                <span className={`text-sm font-medium ${isSelected ? 'text-green-400' : 'text-neutral-300'}`}>
                                  {wallet.label}
                                </span>
                              </div>
                              <span className="text-neutral-400 text-xs font-mono">
                                {wallet.address.slice(0, 6)}...{wallet.address.slice(-4)}
                              </span>
                            </div>
                            <div className="flex items-center justify-between mt-2 pl-4">
                              <span className="text-xs text-neutral-500">Balance:</span>
                              <span className={`text-xs font-medium ${hasSufficientBalance ? 'text-green-400' : 'text-red-400'}`}>
                                {paymentToken === 'OGUN' ? wallet.ogunBalance : wallet.polBalance} {paymentToken}
                                {!hasSufficientBalance && ' (insufficient)'}
                              </span>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                    {/* Option to connect more wallets */}
                    {(!metamaskAccount || (activeWalletType !== 'web3modal' && activeWalletType !== 'direct')) && (
                      <div className="mt-2 flex gap-2">
                        {!metamaskAccount && (
                          <button
                            onClick={connectMetaMask}
                            className="flex-1 py-2 px-3 bg-neutral-800 border border-neutral-700 hover:border-orange-500/50 rounded-lg text-neutral-400 hover:text-orange-400 text-xs font-medium transition-all"
                          >
                            + MetaMask
                          </button>
                        )}
                        {activeWalletType !== 'web3modal' && activeWalletType !== 'direct' && (
                          <button
                            onClick={() => isWeb3ModalReady && connectWeb3Modal()}
                            disabled={!isWeb3ModalReady}
                            className="flex-1 py-2 px-3 bg-neutral-800 border border-neutral-700 hover:border-purple-500/50 rounded-lg text-neutral-400 hover:text-purple-400 text-xs font-medium transition-all disabled:opacity-50"
                          >
                            + WalletConnect
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Token Selection */}
                <div className="mb-4">
                  <label className="text-neutral-500 text-xs uppercase tracking-wide mb-2 block">
                    Pay with
                  </label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPaymentToken('OGUN')}
                      className={`flex-1 py-3 px-4 rounded-xl text-sm font-medium transition-all ${
                        paymentToken === 'OGUN'
                          ? 'bg-yellow-500/20 border border-yellow-500 text-yellow-400'
                          : 'bg-neutral-800 border border-neutral-700 text-neutral-400 hover:border-neutral-600'
                      }`}
                    >
                      <Coins className="w-4 h-4 inline mr-2" />
                      OGUN
                    </button>
                    <button
                      onClick={() => setPaymentToken('POL')}
                      className={`flex-1 py-3 px-4 rounded-xl text-sm font-medium transition-all ${
                        paymentToken === 'POL'
                          ? 'bg-purple-500/20 border border-purple-500 text-purple-400'
                          : 'bg-neutral-800 border border-neutral-700 text-neutral-400 hover:border-neutral-600'
                      }`}
                    >
                      POL
                    </button>
                  </div>
                </div>

                {/* Pricing Breakdown */}
                <div className="bg-neutral-800/50 rounded-xl p-4 mb-4">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-neutral-400">File size tier</span>
                    <span className="text-neutral-300">{pricing.tier.label}</span>
                  </div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-neutral-400">Base price</span>
                    <span className="text-neutral-300">
                      {pricing.basePrice} {paymentToken}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-neutral-400">Platform fee (0.05%)</span>
                    <span className="text-neutral-300">
                      {pricing.platformFee.toFixed(6)} {paymentToken}
                    </span>
                  </div>
                  <div className="border-t border-neutral-700 mt-2 pt-2 flex justify-between text-sm font-medium">
                    <span className="text-white">Total</span>
                    <span className={paymentToken === 'OGUN' ? 'text-yellow-400' : 'text-purple-400'}>
                      {pricing.total.toFixed(6)} {paymentToken}
                    </span>
                  </div>
                </div>

                {/* Balance Check */}
                <div className="flex items-center justify-between text-sm mb-4">
                  <span className="text-neutral-500">Your balance:</span>
                  <span className={hasEnoughBalance ? 'text-green-400' : 'text-red-400'}>
                    {paymentToken === 'OGUN' ? ogunBalance : polBalance} {paymentToken}
                  </span>
                </div>

                {!hasEnoughBalance && (
                  <div className="flex items-center gap-2 text-red-400 text-sm mb-4 bg-red-500/10 rounded-lg p-3">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>Insufficient balance. You need {pricing.total.toFixed(4)} {paymentToken}.</span>
                  </div>
                )}

                {/* Action Button */}
                <button
                  onClick={handleMakePermanent}
                  disabled={isProcessing || !hasEnoughBalance || !hasAnyWallet}
                  className={`w-full py-3 rounded-xl font-medium transition-all ${
                    hasEnoughBalance && hasAnyWallet
                      ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black'
                      : 'bg-neutral-700 text-neutral-500 cursor-not-allowed'
                  }`}
                >
                  {!hasAnyWallet ? 'Connect Wallet First' : 'Make Permanent'}
                </button>
              </>
            )}

            {(step === 'fee' || step === 'payment') && (
              <div className="text-center py-8">
                <Loader2 className="w-12 h-12 text-amber-400 animate-spin mx-auto mb-4" />
                <p className="text-white font-medium mb-2">
                  {step === 'fee' ? 'Preparing transaction...' : 'Processing payment...'}
                </p>
                <p className="text-neutral-400 text-sm">
                  Please confirm the transaction in your wallet
                </p>
              </div>
            )}

            {step === 'complete' && (
              <div className="text-center py-8">
                <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-4" />
                <p className="text-white font-medium mb-2">Post is now permanent!</p>
                <p className="text-neutral-400 text-sm">
                  Your post will no longer expire.
                </p>
              </div>
            )}
          </div>

          {/* Cancel button for mobile */}
          {step === 'confirm' && (
            <div className="p-4 pt-0 sm:hidden">
              <button
                onClick={onClose}
                className="w-full py-3 rounded-xl bg-neutral-800 text-neutral-300 font-medium hover:bg-neutral-700 transition-colors"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

export default MakePostPermanentModal
