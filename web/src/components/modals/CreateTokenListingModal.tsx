import { useState, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { X, Coins, Plus, Zap, AlertCircle, ChevronDown, Check, Wallet } from 'lucide-react'
import { SUPPORTED_TOKENS, TOKEN_INFO, TOKEN_ADDRESSES, Token, getDisplaySymbol } from 'constants/tokens'
import { useMagicContext } from 'hooks/useMagicContext'
import { useUnifiedWallet } from 'contexts/UnifiedWalletContext'
import { toast } from 'react-toastify'
import { Card } from 'components/ui/card'
import { Button } from 'components/ui/button'
import { Badge } from 'components/ui/badge'
import { ethers } from 'ethers'

const TOKEN_EXCHANGE_ADDRESS = process.env.NEXT_PUBLIC_TOKEN_EXCHANGE || ''

const OGUN_ADDRESS = '0x45f1af89486aeec2da0b06340cd9cd3bd741a15c'

// Minimal ERC-20 ABI for approve + allowance
const ERC20_ABI = [
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function allowance(address owner, address spender) external view returns (uint256)',
]

// TokenExchange ABI - createListing
const TOKEN_EXCHANGE_ABI = [
  'function createListing(address sellToken, uint256 sellAmount, address askToken, uint256 askAmount, uint256 duration) external payable returns (uint256 listingId)',
]

// Default listing duration: 7 days
const DEFAULT_DURATION = 7 * 24 * 60 * 60

interface CreateTokenListingModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: (listing: TokenListingData) => void
}

export interface TokenListingData {
  id: string
  tokenSymbol: Token
  tokenAmount: number
  chainId: number
  price: { value: number; currency: string }
  usdPrice: number
  seller: string
  createdAt: Date
}

export const CreateTokenListingModal = ({
  isOpen,
  onClose,
  onSuccess,
}: CreateTokenListingModalProps) => {
  const [step, setStep] = useState<'select' | 'price' | 'confirm'>('select')
  const [selectedToken, setSelectedToken] = useState<Token>('OGUN')
  const [tokenAmount, setTokenAmount] = useState('')
  const [pricePerToken, setPricePerToken] = useState('')
  const [priceCurrency, setPriceCurrency] = useState<'OGUN' | 'POL'>('POL')
  const [showTokenDropdown, setShowTokenDropdown] = useState(false)
  const [acceptedTokens, setAcceptedTokens] = useState<Token[]>(['OGUN', 'MATIC'])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [txStatus, setTxStatus] = useState<'idle' | 'approving' | 'creating' | 'confirming'>('idle')

  const { magic, account: magicAccount, ogunBalance } = useMagicContext()
  const { activeAddress, polBalance } = useUnifiedWallet()
  const account = activeAddress || magicAccount

  const totalPrice = useMemo(() => {
    const amount = parseFloat(tokenAmount) || 0
    const price = parseFloat(pricePerToken) || 0
    return amount * price
  }, [tokenAmount, pricePerToken])

  const platformFee = useMemo(() => totalPrice * 0.0005, [totalPrice])

  /** Resolve the on-chain address for the sell token. address(0) = native POL */
  const getSellTokenAddress = (): string => {
    if (selectedToken === 'MATIC') return ethers.constants.AddressZero // native POL
    if (selectedToken === 'OGUN') return OGUN_ADDRESS
    // Check TOKEN_ADDRESSES for any other known token
    const addr = (TOKEN_ADDRESSES as Record<string, string | undefined>)[selectedToken]
    if (addr) return addr
    return ethers.constants.AddressZero
  }

  /** Resolve the on-chain address for the ask (payment) token */
  const getAskTokenAddress = (): string => {
    if (priceCurrency === 'POL') return ethers.constants.AddressZero // native POL
    if (priceCurrency === 'OGUN') return OGUN_ADDRESS
    return ethers.constants.AddressZero
  }

  const handleSubmit = async () => {
    if (!account) {
      toast.error('Please connect your wallet first')
      return
    }

    if (!TOKEN_EXCHANGE_ADDRESS) {
      toast.error('Token Exchange contract not configured')
      return
    }

    if (!magic) {
      toast.error('Wallet provider not available')
      return
    }

    const amount = parseFloat(tokenAmount)
    const price = parseFloat(pricePerToken)

    if (!amount || amount <= 0) {
      toast.error('Please enter a valid token amount')
      return
    }

    if (!price || price <= 0) {
      toast.error('Please enter a valid price')
      return
    }

    setIsSubmitting(true)
    setTxStatus('idle')

    try {
      const provider = new ethers.providers.Web3Provider((magic as any).rpcProvider, { chainId: 137, name: 'matic' })
      const signer = provider.getSigner()

      const sellTokenAddr = getSellTokenAddress()
      const askTokenAddr = getAskTokenAddress()
      const sellAmountWei = ethers.utils.parseUnits(String(amount), 18)
      const askAmountWei = ethers.utils.parseUnits(totalPrice.toFixed(18), 18)
      const isNativeSell = sellTokenAddr === ethers.constants.AddressZero

      // Step 1: Approve ERC-20 spend (skip for native POL)
      if (!isNativeSell) {
        setTxStatus('approving')
        const tokenContract = new ethers.Contract(sellTokenAddr, ERC20_ABI, signer)

        // Check existing allowance
        const currentAllowance = await tokenContract.allowance(account, TOKEN_EXCHANGE_ADDRESS)
        if (currentAllowance.lt(sellAmountWei)) {
          const approveTx = await tokenContract.approve(TOKEN_EXCHANGE_ADDRESS, sellAmountWei)
          await approveTx.wait()
        }
      }

      // Step 2: Create listing on TokenExchange
      setTxStatus('creating')
      const exchangeContract = new ethers.Contract(TOKEN_EXCHANGE_ADDRESS, TOKEN_EXCHANGE_ABI, signer)

      // If selling native POL, send it as msg.value
      const txOverrides: ethers.PayableOverrides = isNativeSell
        ? { value: sellAmountWei, chainId: 137 }
        : { chainId: 137 }

      const tx = await exchangeContract.createListing(
        sellTokenAddr,
        sellAmountWei,
        askTokenAddr,
        askAmountWei,
        DEFAULT_DURATION,
        txOverrides,
      )

      setTxStatus('confirming')
      const receipt = await tx.wait()

      // Try to parse the listingId from events
      let listingId = `token-${Date.now()}`
      try {
        const iface = new ethers.utils.Interface(TOKEN_EXCHANGE_ABI)
        for (const log of receipt.logs) {
          try {
            const parsed = iface.parseLog(log)
            if (parsed.name === 'ListingCreated' && parsed.args.listingId) {
              listingId = parsed.args.listingId.toString()
              break
            }
          } catch {
            // Not our event, skip
          }
        }
      } catch {
        // Fallback ID is fine
      }

      const newListing: TokenListingData = {
        id: listingId,
        tokenSymbol: selectedToken,
        tokenAmount: amount,
        chainId: 137,
        price: { value: price, currency: priceCurrency },
        usdPrice: price * (priceCurrency === 'POL' ? 0.5 : 0.05),
        seller: account,
        createdAt: new Date(),
      }

      const txHash = receipt.transactionHash
      toast.success(
        <div>
          <p>Listed {amount} {getDisplaySymbol(selectedToken)} for sale!</p>
          <a
            href={`https://polygonscan.com/tx/${txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-cyan-400 underline text-xs"
          >
            View on Polygonscan
          </a>
        </div>
      )

      onSuccess?.(newListing)
      onClose()
      resetForm()
    } catch (error: any) {
      console.error('Failed to create listing:', error)
      const msg = error?.message || 'Unknown error'
      if (msg.includes('user rejected') || msg.includes('User denied')) {
        toast.error('Transaction cancelled')
      } else if (msg.includes('insufficient funds') || msg.includes('insufficient balance')) {
        toast.error('Insufficient balance for this transaction')
      } else {
        toast.error('Failed to create listing. Please try again.')
      }
    } finally {
      setIsSubmitting(false)
      setTxStatus('idle')
    }
  }

  const resetForm = () => {
    setStep('select')
    setSelectedToken('OGUN')
    setTokenAmount('')
    setPricePerToken('')
    setAcceptedTokens(['OGUN', 'MATIC'])
  }

  const toggleAcceptedToken = (token: Token) => {
    if (acceptedTokens.includes(token)) {
      if (acceptedTokens.length > 1) {
        setAcceptedTokens(acceptedTokens.filter(t => t !== token))
      }
    } else {
      setAcceptedTokens([...acceptedTokens, token])
    }
  }

  if (!isOpen) return null

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg animate-fadeIn">
        <Card className="retro-card overflow-hidden">
          {/* Header */}
          <div className="relative p-4 border-b border-white/10 bg-gradient-to-r from-green-500/10 via-cyan-500/10 to-green-500/10">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(16,185,129,0.15),transparent_70%)]" />
            <div className="relative flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500/30 to-cyan-500/30 flex items-center justify-center">
                  <Coins className="w-5 h-5 text-green-400" />
                </div>
                <div>
                  <h2 className="font-bold text-white">List Tokens</h2>
                  <p className="text-xs text-gray-400">Sell tokens on the marketplace</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-full hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            {/* Step Indicator */}
            <div className="flex items-center justify-center gap-2 mt-4">
              {(['select', 'price', 'confirm'] as const).map((s, i) => (
                <div key={s} className="flex items-center gap-2">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    step === s
                      ? 'bg-green-500 text-white'
                      : i < ['select', 'price', 'confirm'].indexOf(step)
                        ? 'bg-green-500/30 text-green-400'
                        : 'bg-white/10 text-gray-500'
                  }`}>
                    {i < ['select', 'price', 'confirm'].indexOf(step) ? <Check className="w-3 h-3" /> : i + 1}
                  </div>
                  {i < 2 && (
                    <div className={`w-8 h-0.5 ${
                      i < ['select', 'price', 'confirm'].indexOf(step) ? 'bg-green-500/50' : 'bg-white/10'
                    }`} />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="p-4 space-y-4 max-h-[60vh] overflow-y-auto">
            {/* Step 1: Token Selection */}
            {step === 'select' && (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300">Select Token to List</label>
                  <div className="relative">
                    <button
                      onClick={() => setShowTokenDropdown(!showTokenDropdown)}
                      className="w-full flex items-center justify-between p-3 rounded-xl bg-black/50 border border-white/10 hover:border-green-500/30 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{TOKEN_INFO[selectedToken]?.icon || '•'}</span>
                        <span className="font-medium text-white">{getDisplaySymbol(selectedToken)}</span>
                        <span className="text-xs text-gray-500">{TOKEN_INFO[selectedToken]?.name}</span>
                      </div>
                      <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showTokenDropdown ? 'rotate-180' : ''}`} />
                    </button>

                    {showTokenDropdown && (
                      <div className="absolute top-full left-0 right-0 mt-2 p-2 rounded-xl bg-gray-900 border border-white/10 shadow-xl z-10 max-h-60 overflow-y-auto">
                        {SUPPORTED_TOKENS.map((token) => (
                          <button
                            key={token}
                            onClick={() => {
                              setSelectedToken(token)
                              setShowTokenDropdown(false)
                            }}
                            className={`w-full flex items-center gap-2 p-2 rounded-lg hover:bg-white/5 transition-colors ${
                              selectedToken === token ? 'bg-green-500/10 border border-green-500/30' : ''
                            }`}
                          >
                            <span className="text-lg">{TOKEN_INFO[token]?.icon || '•'}</span>
                            <span className="font-medium text-white">{getDisplaySymbol(token)}</span>
                            <span className="text-xs text-gray-500">{TOKEN_INFO[token]?.name}</span>
                            {selectedToken === token && <Check className="w-4 h-4 text-green-400 ml-auto" />}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300">Amount to List</label>
                  <div className="relative">
                    <input
                      type="number"
                      value={tokenAmount}
                      onChange={(e) => setTokenAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full p-3 pr-20 rounded-xl bg-black/50 border border-white/10 text-white placeholder-gray-500 focus:border-green-500/50 focus:outline-none transition-colors"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">
                      {getDisplaySymbol(selectedToken)}
                    </span>
                  </div>
                  {selectedToken === 'OGUN' && ogunBalance && (
                    <p className="text-xs text-gray-500">
                      Balance: {parseFloat(ogunBalance).toFixed(2)} OGUN
                    </p>
                  )}
                </div>
              </>
            )}

            {/* Step 2: Pricing */}
            {step === 'price' && (
              <>
                <div className="p-3 rounded-xl bg-green-500/10 border border-green-500/20">
                  <div className="flex items-center gap-2 text-green-400 text-sm">
                    <Coins className="w-4 h-4" />
                    <span>Listing {tokenAmount} {getDisplaySymbol(selectedToken)}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300">Price per Token</label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <input
                        type="number"
                        value={pricePerToken}
                        onChange={(e) => setPricePerToken(e.target.value)}
                        placeholder="0.00"
                        className="w-full p-3 rounded-xl bg-black/50 border border-white/10 text-white placeholder-gray-500 focus:border-green-500/50 focus:outline-none transition-colors"
                      />
                    </div>
                    <div className="flex rounded-xl overflow-hidden border border-white/10">
                      <button
                        onClick={() => setPriceCurrency('POL')}
                        className={`px-3 py-2 text-sm font-medium transition-colors ${
                          priceCurrency === 'POL'
                            ? 'bg-purple-500/20 text-purple-400'
                            : 'bg-black/50 text-gray-400 hover:bg-white/5'
                        }`}
                      >
                        POL
                      </button>
                      <button
                        onClick={() => setPriceCurrency('OGUN')}
                        className={`px-3 py-2 text-sm font-medium transition-colors ${
                          priceCurrency === 'OGUN'
                            ? 'bg-yellow-500/20 text-yellow-400'
                            : 'bg-black/50 text-gray-400 hover:bg-white/5'
                        }`}
                      >
                        OGUN
                      </button>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300">Accepted Payment Tokens</label>
                  <div className="flex flex-wrap gap-2">
                    {SUPPORTED_TOKENS.slice(0, 12).map((token) => (
                      <button
                        key={token}
                        onClick={() => toggleAcceptedToken(token)}
                        className={`px-2 py-1 rounded-full text-xs font-medium transition-all ${
                          acceptedTokens.includes(token)
                            ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                            : 'bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10'
                        }`}
                      >
                        {TOKEN_INFO[token]?.icon} {getDisplaySymbol(token)}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500">Buyers can pay with any selected token via L2 swap</p>
                </div>

                {totalPrice > 0 && (
                  <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Total List Price</span>
                      <span className="text-white font-medium">{totalPrice.toFixed(4)} {priceCurrency}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500">Platform Fee (0.05%)</span>
                      <span className="text-gray-400">{platformFee.toFixed(6)} {priceCurrency}</span>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Step 3: Confirmation */}
            {step === 'confirm' && (
              <>
                <div className="p-4 rounded-xl bg-gradient-to-br from-green-500/10 to-cyan-500/10 border border-green-500/20 space-y-3">
                  <h3 className="font-medium text-white text-center">Listing Summary</h3>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Token</span>
                      <span className="text-white">{TOKEN_INFO[selectedToken]?.icon} {getDisplaySymbol(selectedToken)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Amount</span>
                      <span className="text-white">{tokenAmount}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Price per Token</span>
                      <span className="text-white">{pricePerToken} {priceCurrency}</span>
                    </div>
                    <div className="flex justify-between text-sm border-t border-white/10 pt-2">
                      <span className="text-gray-400">Total Value</span>
                      <span className="text-green-400 font-medium">{totalPrice.toFixed(4)} {priceCurrency}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mt-3 p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
                    <Zap className="w-4 h-4 text-cyan-400" />
                    <span className="text-xs text-cyan-400">L2 powered • 0.05% fee • Instant settlement</span>
                  </div>
                </div>

                {!account && (
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
                    <AlertCircle className="w-4 h-4 text-yellow-400" />
                    <span className="text-sm text-yellow-400">Connect wallet to create listing</span>
                  </div>
                )}

                {account && (
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-green-500/10 border border-green-500/20">
                    <Wallet className="w-4 h-4 text-green-400" />
                    <span className="text-sm text-green-400 font-mono truncate">{account}</span>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-white/10 bg-black/30 flex gap-3">
            {step !== 'select' && (
              <Button
                variant="outline"
                onClick={() => setStep(step === 'confirm' ? 'price' : 'select')}
                className="flex-1 border-white/10 text-gray-400 hover:bg-white/5"
              >
                Back
              </Button>
            )}

            {step === 'select' && (
              <Button
                onClick={() => setStep('price')}
                disabled={!tokenAmount || parseFloat(tokenAmount) <= 0}
                className="flex-1 bg-gradient-to-r from-green-500 to-cyan-500 hover:from-green-600 hover:to-cyan-600 text-white font-semibold disabled:opacity-50"
              >
                Continue
              </Button>
            )}

            {step === 'price' && (
              <Button
                onClick={() => setStep('confirm')}
                disabled={!pricePerToken || parseFloat(pricePerToken) <= 0}
                className="flex-1 bg-gradient-to-r from-green-500 to-cyan-500 hover:from-green-600 hover:to-cyan-600 text-white font-semibold disabled:opacity-50"
              >
                Review Listing
              </Button>
            )}

            {step === 'confirm' && (
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting || !account}
                className="flex-1 bg-gradient-to-r from-green-500 to-cyan-500 hover:from-green-600 hover:to-cyan-600 text-white font-semibold disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                    {txStatus === 'approving' && 'Approving Token...'}
                    {txStatus === 'creating' && 'Creating Listing...'}
                    {txStatus === 'confirming' && 'Confirming TX...'}
                    {txStatus === 'idle' && 'Preparing...'}
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Listing
                  </>
                )}
              </Button>
            )}
          </div>
        </Card>
      </div>
    </div>
  )

  // Use portal to render at document root
  if (typeof window === 'undefined') return null
  return createPortal(modalContent, document.body)
}
