import { useState, useMemo, useEffect, useCallback } from 'react'
import { X, Lock, Coins, AlertCircle, CheckCircle, Loader2, Wallet, ChevronDown, ChevronUp } from 'lucide-react'
import { config } from '../../config'
import { useMagicContext } from 'hooks/useMagicContext'
import { useUnifiedWallet } from 'contexts/UnifiedWalletContext'
import { useMutation } from '@apollo/client'
import { MAKE_POST_PERMANENT_MUTATION } from 'lib/graphql/mutations'
import { useMeQuery } from 'lib/graphql'
import Web3 from 'web3'
import { toast } from 'react-toastify'

// Detect mobile device
const isMobile = () => {
  if (typeof window === 'undefined') return false
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
}

// Get specific wallet provider when multiple wallets are installed
const getSpecificProvider = (walletType: 'metamask' | 'coinbase' | 'trust' | 'any'): any => {
  if (typeof window === 'undefined') return null

  const ethereum = (window as any).ethereum
  if (!ethereum) return null

  const providers = ethereum.providers || []

  if (walletType === 'metamask') {
    const metamaskProvider = providers.find((p: any) => p.isMetaMask && !p.isCoinbaseWallet)
    if (metamaskProvider) return metamaskProvider
    if (ethereum.isMetaMask && !ethereum.isCoinbaseWallet) return ethereum
    return null
  }

  if (walletType === 'coinbase') {
    const coinbaseProvider = providers.find((p: any) => p.isCoinbaseWallet)
    if (coinbaseProvider) return coinbaseProvider
    if (ethereum.isCoinbaseWallet) return ethereum
    return null
  }

  return ethereum
}

// OGUN Token ABI (transfer + balanceOf)
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
  {
    inputs: [{ name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
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
  const [showDetails, setShowDetails] = useState(false)
  const [showWallets, setShowWallets] = useState(false)

  // Get user's stored wallet addresses (for wallet-only users)
  const { data: userData } = useMeQuery({ skip: !isOpen })
  const storedWalletAddresses = userData?.me?.metaMaskWalletAddressees || []
  const isWalletOnlyUser = storedWalletAddresses.length > 0 && !userData?.me?.magicWalletAddress && !userData?.me?.googleWalletAddress && !userData?.me?.discordWalletAddress && !userData?.me?.twitchWalletAddress

  // Multi-wallet support
  const { web3: magicWeb3, account: magicAccount, ogunBalance: magicOgunBalance, balance: magicPolBalance } = useMagicContext()
  const {
    activeWalletType,
    activeAddress,
    web3: unifiedWeb3,
    ogunBalance: unifiedOgunBalance,
    polBalance: unifiedPolBalance,
    connectWeb3Modal,
    isWeb3ModalReady,
    setDirectConnection,
  } = useUnifiedWallet()

  // Track MetaMask connection state
  const [metamaskAccount, setMetamaskAccount] = useState<string | null>(null)
  const [metamaskWeb3, setMetamaskWeb3] = useState<Web3 | null>(null)
  const [metamaskOgunBalance, setMetamaskOgunBalance] = useState<string>('0')
  const [metamaskPolBalance, setMetamaskPolBalance] = useState<string>('0')
  const [isConnecting, setIsConnecting] = useState(false)

  // Connect MetaMask with proper provider detection
  const connectMetaMask = useCallback(async () => {
    const metamaskProvider = getSpecificProvider('metamask')

    if (isMobile()) {
      window.location.href = `https://metamask.app.link/dapp/${window.location.host}`
      return
    }

    if (!metamaskProvider) {
      toast.error('MetaMask not detected. Please install the extension.')
      window.open('https://metamask.io/download/', '_blank')
      return
    }

    setIsConnecting(true)
    try {
      const accounts = await metamaskProvider.request({ method: 'eth_requestAccounts' })
      if (accounts && accounts[0]) {
        const chainIdHex = await metamaskProvider.request({ method: 'eth_chainId' })
        const chainId = parseInt(chainIdHex as string, 16)

        const web3Instance = new Web3(metamaskProvider as any)
        setMetamaskWeb3(web3Instance)
        setMetamaskAccount(accounts[0])
        setDirectConnection(accounts[0], 'metamask', chainId)

        const polWei = await web3Instance.eth.getBalance(accounts[0])
        setMetamaskPolBalance(web3Instance.utils.fromWei(polWei, 'ether'))

        try {
          const ogunContract = new web3Instance.eth.Contract(OGUN_ABI as any, config.ogunTokenAddress)
          const ogunWei = await ogunContract.methods.balanceOf(accounts[0]).call()
          setMetamaskOgunBalance(web3Instance.utils.fromWei(ogunWei as string, 'ether'))
        } catch {
          setMetamaskOgunBalance('0')
        }

        toast.success('MetaMask connected!')
        setShowWallets(false)
      }
    } catch (err: any) {
      console.error('MetaMask connection error:', err)
      toast.error(err.message || 'Failed to connect MetaMask')
    } finally {
      setIsConnecting(false)
    }
  }, [setDirectConnection])

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
        label: 'Magic',
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

  // Auto-select first wallet with sufficient balance
  useEffect(() => {
    if (availableWallets.length > 0 && !selectedWallet) {
      const walletWithBalance = availableWallets.find(w => {
        const balance = paymentToken === 'OGUN' ? parseFloat(w.ogunBalance) : parseFloat(w.polBalance)
        return balance >= pricing.total
      })
      setSelectedWallet(walletWithBalance?.type || availableWallets[0].type)
    }
  }, [availableWallets.length])

  const currentWallet = useMemo(() => {
    return availableWallets.find(w => w.type === selectedWallet) || availableWallets[0] || null
  }, [availableWallets, selectedWallet])

  const hasAnyWallet = availableWallets.length > 0

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
    let tier = tiers[0]
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

    return { tier, basePrice, platformFee, total }
  }, [mediaSize, paymentToken])

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
        setStep('payment')
        const amountWei = web3.utils.toWei(pricing.total.toString(), 'ether')
        const tx = await web3.eth.sendTransaction({
          from: connectedAccount,
          to: treasuryAddress,
          value: amountWei,
        })
        txHash = tx.transactionHash
      } else {
        setStep('payment')
        const ogunContract = new web3.eth.Contract(OGUN_ABI as any, config.ogunTokenAddress)
        const amountWei = web3.utils.toWei(pricing.total.toString(), 'ether')
        const tx = await ogunContract.methods.transfer(treasuryAddress, amountWei).send({
          from: connectedAccount,
        })
        txHash = tx.transactionHash
      }

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

  // Processing/Complete states - compact spinner
  if (step === 'fee' || step === 'payment' || step === 'complete') {
    return (
      <div className="fixed bottom-4 left-4 right-4 z-50 sm:left-auto sm:right-4 sm:w-80">
        <div className="bg-neutral-900/95 backdrop-blur-xl border border-neutral-700 rounded-2xl shadow-2xl p-4">
          {step === 'complete' ? (
            <div className="flex items-center gap-3">
              <CheckCircle className="w-6 h-6 text-green-400 flex-shrink-0" />
              <div>
                <p className="text-white font-medium text-sm">Post is permanent!</p>
                <p className="text-neutral-500 text-xs">No longer expires</p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Loader2 className="w-6 h-6 text-amber-400 animate-spin flex-shrink-0" />
              <div>
                <p className="text-white font-medium text-sm">
                  {step === 'fee' ? 'Preparing...' : 'Processing...'}
                </p>
                <p className="text-neutral-500 text-xs">Confirm in wallet</p>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 sm:left-auto sm:right-4 sm:w-96">
      <div className="bg-neutral-900/95 backdrop-blur-xl border border-neutral-700 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header - Always visible */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-800">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-amber-400" />
            <span className="text-white font-medium text-sm">Make Permanent</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-neutral-800 transition-colors"
          >
            <X className="w-4 h-4 text-neutral-400" />
          </button>
        </div>

        {/* Quick Actions - Compact by default */}
        <div className="p-3 space-y-3">
          {/* No wallet connected */}
          {!hasAnyWallet && (
            <div className="space-y-2">
              <p className="text-neutral-400 text-xs">Connect wallet to continue</p>
              <div className="flex gap-2">
                <button
                  onClick={connectMetaMask}
                  disabled={isConnecting}
                  className="flex-1 py-2 px-3 bg-orange-500/20 border border-orange-500/40 rounded-xl text-orange-400 text-xs font-medium hover:bg-orange-500/30 transition-all"
                >
                  MetaMask
                </button>
                <button
                  onClick={() => isWeb3ModalReady && connectWeb3Modal()}
                  disabled={!isWeb3ModalReady}
                  className="flex-1 py-2 px-3 bg-purple-500/20 border border-purple-500/40 rounded-xl text-purple-400 text-xs font-medium hover:bg-purple-500/30 transition-all disabled:opacity-50"
                >
                  WalletConnect
                </button>
              </div>
            </div>
          )}

          {/* Has wallet - show quick pay */}
          {hasAnyWallet && (
            <>
              {/* Token toggle - slim */}
              <div className="flex bg-neutral-800/50 rounded-xl p-0.5">
                <button
                  onClick={() => setPaymentToken('OGUN')}
                  className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-medium transition-all ${
                    paymentToken === 'OGUN'
                      ? 'bg-yellow-500/20 text-yellow-400'
                      : 'text-neutral-500 hover:text-neutral-300'
                  }`}
                >
                  <Coins className="w-3 h-3 inline mr-1" />
                  OGUN
                </button>
                <button
                  onClick={() => setPaymentToken('POL')}
                  className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-medium transition-all ${
                    paymentToken === 'POL'
                      ? 'bg-purple-500/20 text-purple-400'
                      : 'text-neutral-500 hover:text-neutral-300'
                  }`}
                >
                  POL
                </button>
              </div>

              {/* Price + Pay button row */}
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <div className="flex items-baseline gap-1">
                    <span className={`text-lg font-bold ${paymentToken === 'OGUN' ? 'text-yellow-400' : 'text-purple-400'}`}>
                      {pricing.total.toFixed(2)}
                    </span>
                    <span className="text-neutral-500 text-xs">{paymentToken}</span>
                  </div>
                  <p className="text-neutral-500 text-xs">{pricing.tier.label}</p>
                </div>
                <button
                  onClick={handleMakePermanent}
                  disabled={isProcessing || !hasEnoughBalance}
                  className={`py-2.5 px-5 rounded-xl font-medium text-sm transition-all ${
                    hasEnoughBalance
                      ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black'
                      : 'bg-neutral-700 text-neutral-500 cursor-not-allowed'
                  }`}
                >
                  Pay
                </button>
              </div>

              {/* Insufficient balance warning - compact */}
              {!hasEnoughBalance && (
                <div className="flex items-center gap-2 text-red-400 text-xs bg-red-500/10 rounded-lg px-3 py-2">
                  <AlertCircle className="w-3 h-3 flex-shrink-0" />
                  <span>Need {pricing.total.toFixed(2)} {paymentToken} (have {paymentToken === 'OGUN' ? parseFloat(ogunBalance).toFixed(2) : parseFloat(polBalance).toFixed(2)})</span>
                </div>
              )}

              {/* Expandable wallet section */}
              <button
                onClick={() => setShowWallets(!showWallets)}
                className="w-full flex items-center justify-between py-2 px-3 bg-neutral-800/30 rounded-xl hover:bg-neutral-800/50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Wallet className="w-3.5 h-3.5 text-neutral-500" />
                  <span className="text-neutral-400 text-xs">
                    {currentWallet ? `${currentWallet.label} ...${currentWallet.address.slice(-4)}` : 'Select wallet'}
                  </span>
                </div>
                {showWallets ? (
                  <ChevronUp className="w-3.5 h-3.5 text-neutral-500" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5 text-neutral-500" />
                )}
              </button>

              {/* Wallet list - expandable */}
              {showWallets && (
                <div className="space-y-1.5 pl-2">
                  {availableWallets.map((wallet) => {
                    const isSelected = selectedWallet === wallet.type
                    const balance = paymentToken === 'OGUN' ? wallet.ogunBalance : wallet.polBalance
                    const hasSufficient = parseFloat(balance) >= pricing.total
                    return (
                      <button
                        key={wallet.type}
                        onClick={() => {
                          setSelectedWallet(wallet.type)
                          setShowWallets(false)
                        }}
                        className={`w-full flex items-center justify-between p-2 rounded-lg transition-all ${
                          isSelected
                            ? 'bg-green-500/10 border border-green-500/30'
                            : 'bg-neutral-800/30 border border-transparent hover:border-neutral-700'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <div className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-green-400' : 'bg-neutral-600'}`} />
                          <span className={`text-xs ${isSelected ? 'text-green-400' : 'text-neutral-400'}`}>
                            {wallet.label}
                          </span>
                        </div>
                        <span className={`text-xs font-mono ${hasSufficient ? 'text-green-400' : 'text-red-400'}`}>
                          {parseFloat(balance).toFixed(2)} {paymentToken}
                        </span>
                      </button>
                    )
                  })}
                  {/* Add more wallets */}
                  <div className="flex gap-1.5 pt-1">
                    {!metamaskAccount && (
                      <button
                        onClick={connectMetaMask}
                        className="flex-1 py-1.5 text-xs text-neutral-500 hover:text-orange-400 transition-colors"
                      >
                        + MetaMask
                      </button>
                    )}
                    {activeWalletType !== 'web3modal' && (
                      <button
                        onClick={() => isWeb3ModalReady && connectWeb3Modal()}
                        className="flex-1 py-1.5 text-xs text-neutral-500 hover:text-purple-400 transition-colors"
                      >
                        + WalletConnect
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Expandable details section */}
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="w-full flex items-center justify-between py-2 px-3 bg-neutral-800/30 rounded-xl hover:bg-neutral-800/50 transition-colors"
              >
                <span className="text-neutral-400 text-xs">Price breakdown</span>
                {showDetails ? (
                  <ChevronUp className="w-3.5 h-3.5 text-neutral-500" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5 text-neutral-500" />
                )}
              </button>

              {showDetails && (
                <div className="space-y-1.5 pl-2 text-xs">
                  <div className="flex justify-between text-neutral-500">
                    <span>Base ({pricing.tier.label})</span>
                    <span>{pricing.basePrice.toFixed(4)} {paymentToken}</span>
                  </div>
                  <div className="flex justify-between text-neutral-500">
                    <span>Platform fee (0.05%)</span>
                    <span>{pricing.platformFee.toFixed(6)} {paymentToken}</span>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-neutral-800">
                    <span className="text-neutral-400 font-medium">Total</span>
                    <span className={`font-medium ${paymentToken === 'OGUN' ? 'text-yellow-400' : 'text-purple-400'}`}>
                      {pricing.total.toFixed(4)} {paymentToken}
                    </span>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default MakePostPermanentModal
