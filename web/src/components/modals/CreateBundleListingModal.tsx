import { useState, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { X, Package, Plus, Zap, AlertCircle, ChevronDown, Check, Wallet, Image as ImageIcon, Coins, Gift } from 'lucide-react'
import { SUPPORTED_TOKENS, TOKEN_INFO, Token, getDisplaySymbol } from 'constants/tokens'
import { useMagicContext } from 'hooks/useMagicContext'
import { useUnifiedWallet } from 'contexts/UnifiedWalletContext'
import { toast } from 'react-toastify'
import { Card } from 'components/ui/card'
import { Button } from 'components/ui/button'
import { Badge } from 'components/ui/badge'

interface CreateBundleListingModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: (listing: BundleListingData) => void
  userNFTs?: Array<{ id: string; title: string; imageUrl?: string; artist?: string }>
}

export interface BundleListingData {
  id: string
  nftIds: string[]
  tokenSymbol: Token
  tokenAmount: number
  chainId: number
  privateAsset?: string
  price: { value: number; currency: string }
  usdPrice: number
  seller: string
  createdAt: Date
}

const PRIVATE_ASSET_OPTIONS = [
  { value: 'concert_tickets', label: 'Concert Tickets', icon: '🎫', description: 'Live show access' },
  { value: 'movie_tickets', label: 'Movie Tickets', icon: '🎬', description: 'Cinema passes' },
  { value: 'sporting_event', label: 'Sporting Event', icon: '🏟️', description: 'Game day tickets' },
  { value: 'vinyl', label: 'Vinyl Record', icon: '🎵', description: 'Physical vinyl' },
  { value: 'merch', label: 'Merchandise', icon: '👕', description: 'Clothing & items' },
  { value: 'digital_download', label: 'Digital Download', icon: '💾', description: 'Exclusive files' },
  { value: 'meet_greet', label: 'Meet & Greet', icon: '🤝', description: 'Artist access' },
  { value: 'none', label: 'No Physical Perk', icon: '📦', description: 'Digital only' },
]

export const CreateBundleListingModal = ({
  isOpen,
  onClose,
  onSuccess,
  userNFTs = [],
}: CreateBundleListingModalProps) => {
  const [step, setStep] = useState<'nfts' | 'tokens' | 'perks' | 'price' | 'confirm'>('nfts')
  const [selectedNFTs, setSelectedNFTs] = useState<string[]>([])
  const [selectedToken, setSelectedToken] = useState<Token>('OGUN')
  const [tokenAmount, setTokenAmount] = useState('')
  const [privateAsset, setPrivateAsset] = useState<string>('none')
  const [bundlePrice, setBundlePrice] = useState('')
  const [priceCurrency, setPriceCurrency] = useState<'OGUN' | 'POL'>('POL')
  const [showTokenDropdown, setShowTokenDropdown] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { account: magicAccount } = useMagicContext()
  const { activeAddress } = useUnifiedWallet()
  const account = activeAddress || magicAccount

  const platformFee = useMemo(() => {
    const price = parseFloat(bundlePrice) || 0
    return price * 0.0005
  }, [bundlePrice])

  // Mock NFT data for demo
  const mockNFTs = useMemo(() => {
    if (userNFTs.length > 0) return userNFTs
    return [
      { id: 'nft-1', title: 'Midnight Beats #42', imageUrl: '/images/nft-placeholder.jpg', artist: 'DJ Nova' },
      { id: 'nft-2', title: 'Synth Dreams', imageUrl: '/images/nft-placeholder.jpg', artist: 'Crystal Wave' },
      { id: 'nft-3', title: 'Bass Drop Vol. 1', imageUrl: '/images/nft-placeholder.jpg', artist: 'Lowkey' },
      { id: 'nft-4', title: 'Ambient Journey', imageUrl: '/images/nft-placeholder.jpg', artist: 'Zen Master' },
      { id: 'nft-5', title: 'Electric Soul', imageUrl: '/images/nft-placeholder.jpg', artist: 'Spark' },
      { id: 'nft-6', title: 'Rhythm Nation', imageUrl: '/images/nft-placeholder.jpg', artist: 'Flow State' },
    ]
  }, [userNFTs])

  const toggleNFT = (nftId: string) => {
    if (selectedNFTs.includes(nftId)) {
      setSelectedNFTs(selectedNFTs.filter(id => id !== nftId))
    } else {
      setSelectedNFTs([...selectedNFTs, nftId])
    }
  }

  const handleSubmit = async () => {
    if (!account) {
      toast.error('Please connect your wallet first')
      return
    }

    if (selectedNFTs.length === 0) {
      toast.error('Please select at least one NFT')
      return
    }

    const price = parseFloat(bundlePrice)
    if (!price || price <= 0) {
      toast.error('Please enter a valid bundle price')
      return
    }

    setIsSubmitting(true)

    try {
      const newListing: BundleListingData = {
        id: `bundle-${Date.now()}`,
        nftIds: selectedNFTs,
        tokenSymbol: selectedToken,
        tokenAmount: parseFloat(tokenAmount) || 0,
        chainId: 137,
        privateAsset: privateAsset !== 'none' ? privateAsset : undefined,
        price: { value: price, currency: priceCurrency },
        usdPrice: price * (priceCurrency === 'POL' ? 0.5 : 0.05),
        seller: account,
        createdAt: new Date(),
      }

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500))

      toast.success(`Bundle created with ${selectedNFTs.length} NFT${selectedNFTs.length > 1 ? 's' : ''}!`)
      onSuccess?.(newListing)
      onClose()
      resetForm()
    } catch (error) {
      console.error('Failed to create bundle:', error)
      toast.error('Failed to create bundle. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const resetForm = () => {
    setStep('nfts')
    setSelectedNFTs([])
    setSelectedToken('OGUN')
    setTokenAmount('')
    setPrivateAsset('none')
    setBundlePrice('')
  }

  const getStepIndex = (s: string) => ['nfts', 'tokens', 'perks', 'price', 'confirm'].indexOf(s)
  const currentStepIndex = getStepIndex(step)

  if (!isOpen) return null

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-2xl animate-fadeIn">
        <Card className="retro-card overflow-hidden">
          {/* Header */}
          <div className="relative p-4 border-b border-white/10 bg-gradient-to-r from-cyan-500/10 via-purple-500/10 to-cyan-500/10">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(6,182,212,0.15),transparent_70%)]" />
            <div className="relative flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500/30 to-purple-500/30 flex items-center justify-center">
                  <Package className="w-5 h-5 text-cyan-400" />
                </div>
                <div>
                  <h2 className="font-bold text-white">Create Bundle</h2>
                  <p className="text-xs text-gray-400">NFTs + Tokens + Real-World Perks</p>
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
            <div className="flex items-center justify-center gap-1 mt-4">
              {(['nfts', 'tokens', 'perks', 'price', 'confirm'] as const).map((s, i) => (
                <div key={s} className="flex items-center gap-1">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${
                    step === s
                      ? 'bg-cyan-500 text-white'
                      : i < currentStepIndex
                        ? 'bg-cyan-500/30 text-cyan-400'
                        : 'bg-white/10 text-gray-500'
                  }`}>
                    {i < currentStepIndex ? <Check className="w-3 h-3" /> : i + 1}
                  </div>
                  {i < 4 && (
                    <div className={`w-4 h-0.5 ${
                      i < currentStepIndex ? 'bg-cyan-500/50' : 'bg-white/10'
                    }`} />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="p-4 space-y-4 max-h-[55vh] overflow-y-auto">
            {/* Step 1: NFT Selection */}
            {step === 'nfts' && (
              <>
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-300">Select NFTs for Bundle</label>
                  <Badge className="bg-cyan-500/20 text-cyan-400">{selectedNFTs.length} selected</Badge>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {mockNFTs.map((nft) => (
                    <button
                      key={nft.id}
                      onClick={() => toggleNFT(nft.id)}
                      className={`relative p-2 rounded-xl border transition-all ${
                        selectedNFTs.includes(nft.id)
                          ? 'bg-cyan-500/10 border-cyan-500/50 shadow-[0_0_20px_rgba(6,182,212,0.2)]'
                          : 'bg-black/30 border-white/10 hover:border-white/20'
                      }`}
                    >
                      <div className="aspect-square rounded-lg bg-gradient-to-br from-purple-500/20 to-cyan-500/20 flex items-center justify-center mb-2">
                        <ImageIcon className="w-8 h-8 text-gray-500" />
                      </div>
                      <p className="text-xs font-medium text-white truncate">{nft.title}</p>
                      <p className="text-[10px] text-gray-500 truncate">{nft.artist}</p>

                      {selectedNFTs.includes(nft.id) && (
                        <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-cyan-500 flex items-center justify-center">
                          <Check className="w-3 h-3 text-white" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>

                {mockNFTs.length === 0 && (
                  <div className="text-center py-8">
                    <ImageIcon className="w-12 h-12 mx-auto mb-3 text-gray-500" />
                    <p className="text-gray-400">No NFTs found in your wallet</p>
                    <p className="text-xs text-gray-500 mt-1">Mint some NFTs first to create bundles</p>
                  </div>
                )}
              </>
            )}

            {/* Step 2: Token Addition */}
            {step === 'tokens' && (
              <>
                <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
                  <div className="flex items-center gap-2 text-cyan-400 text-sm">
                    <ImageIcon className="w-4 h-4" />
                    <span>{selectedNFTs.length} NFT{selectedNFTs.length > 1 ? 's' : ''} selected</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300">Add Tokens to Bundle (Optional)</label>
                  <div className="relative">
                    <button
                      onClick={() => setShowTokenDropdown(!showTokenDropdown)}
                      className="w-full flex items-center justify-between p-3 rounded-xl bg-black/50 border border-white/10 hover:border-cyan-500/30 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{TOKEN_INFO[selectedToken]?.icon || '•'}</span>
                        <span className="font-medium text-white">{getDisplaySymbol(selectedToken)}</span>
                      </div>
                      <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showTokenDropdown ? 'rotate-180' : ''}`} />
                    </button>

                    {showTokenDropdown && (
                      <div className="absolute top-full left-0 right-0 mt-2 p-2 rounded-xl bg-gray-900 border border-white/10 shadow-xl z-10 max-h-48 overflow-y-auto">
                        {SUPPORTED_TOKENS.slice(0, 12).map((token) => (
                          <button
                            key={token}
                            onClick={() => {
                              setSelectedToken(token)
                              setShowTokenDropdown(false)
                            }}
                            className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-white/5 transition-colors"
                          >
                            <span className="text-lg">{TOKEN_INFO[token]?.icon || '•'}</span>
                            <span className="font-medium text-white">{getDisplaySymbol(token)}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300">Token Amount</label>
                  <div className="relative">
                    <input
                      type="number"
                      value={tokenAmount}
                      onChange={(e) => setTokenAmount(e.target.value)}
                      placeholder="0 (optional)"
                      className="w-full p-3 pr-20 rounded-xl bg-black/50 border border-white/10 text-white placeholder-gray-500 focus:border-cyan-500/50 focus:outline-none transition-colors"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">
                      {getDisplaySymbol(selectedToken)}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">Add tokens to increase bundle value</p>
                </div>
              </>
            )}

            {/* Step 3: Private Asset/Perk Selection */}
            {step === 'perks' && (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300">Real-World Perk (Optional)</label>
                  <p className="text-xs text-gray-500">Include a physical item or experience with your bundle</p>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {PRIVATE_ASSET_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setPrivateAsset(option.value)}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        privateAsset === option.value
                          ? 'bg-purple-500/10 border-purple-500/50'
                          : 'bg-black/30 border-white/10 hover:border-white/20'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg">{option.icon}</span>
                        <span className="text-sm font-medium text-white">{option.label}</span>
                      </div>
                      <p className="text-[10px] text-gray-500">{option.description}</p>
                      {privateAsset === option.value && (
                        <Check className="absolute top-2 right-2 w-4 h-4 text-purple-400" />
                      )}
                    </button>
                  ))}
                </div>
              </>
            )}

            {/* Step 4: Pricing */}
            {step === 'price' && (
              <>
                <div className="p-3 rounded-xl bg-gradient-to-r from-cyan-500/10 to-purple-500/10 border border-cyan-500/20 space-y-2">
                  <p className="text-sm text-gray-300">Bundle Contents:</p>
                  <div className="flex flex-wrap gap-2">
                    <Badge className="bg-cyan-500/20 text-cyan-400">{selectedNFTs.length} NFT{selectedNFTs.length > 1 ? 's' : ''}</Badge>
                    {parseFloat(tokenAmount) > 0 && (
                      <Badge className="bg-green-500/20 text-green-400">{tokenAmount} {getDisplaySymbol(selectedToken)}</Badge>
                    )}
                    {privateAsset !== 'none' && (
                      <Badge className="bg-purple-500/20 text-purple-400">
                        {PRIVATE_ASSET_OPTIONS.find(o => o.value === privateAsset)?.icon} {PRIVATE_ASSET_OPTIONS.find(o => o.value === privateAsset)?.label}
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300">Bundle Price</label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <input
                        type="number"
                        value={bundlePrice}
                        onChange={(e) => setBundlePrice(e.target.value)}
                        placeholder="0.00"
                        className="w-full p-3 rounded-xl bg-black/50 border border-white/10 text-white placeholder-gray-500 focus:border-cyan-500/50 focus:outline-none transition-colors"
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

                {parseFloat(bundlePrice) > 0 && (
                  <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Bundle Price</span>
                      <span className="text-white font-medium">{bundlePrice} {priceCurrency}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500">Platform Fee (0.05%)</span>
                      <span className="text-gray-400">{platformFee.toFixed(6)} {priceCurrency}</span>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Step 5: Confirmation */}
            {step === 'confirm' && (
              <>
                <div className="p-4 rounded-xl bg-gradient-to-br from-cyan-500/10 to-purple-500/10 border border-cyan-500/20 space-y-3">
                  <h3 className="font-medium text-white text-center">Bundle Summary</h3>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">NFTs Included</span>
                      <span className="text-white">{selectedNFTs.length}</span>
                    </div>
                    {parseFloat(tokenAmount) > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Tokens Included</span>
                        <span className="text-white">{tokenAmount} {getDisplaySymbol(selectedToken)}</span>
                      </div>
                    )}
                    {privateAsset !== 'none' && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Real-World Perk</span>
                        <span className="text-white">{PRIVATE_ASSET_OPTIONS.find(o => o.value === privateAsset)?.label}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm border-t border-white/10 pt-2">
                      <span className="text-gray-400">Bundle Price</span>
                      <span className="text-cyan-400 font-medium">{bundlePrice} {priceCurrency}</span>
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
                    <span className="text-sm text-yellow-400">Connect wallet to create bundle</span>
                  </div>
                )}

                {account && (
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
                    <Wallet className="w-4 h-4 text-cyan-400" />
                    <span className="text-sm text-cyan-400 font-mono truncate">{account}</span>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-white/10 bg-black/30 flex gap-3">
            {step !== 'nfts' && (
              <Button
                variant="outline"
                onClick={() => {
                  const steps: Array<'nfts' | 'tokens' | 'perks' | 'price' | 'confirm'> = ['nfts', 'tokens', 'perks', 'price', 'confirm']
                  setStep(steps[currentStepIndex - 1])
                }}
                className="flex-1 border-white/10 text-gray-400 hover:bg-white/5"
              >
                Back
              </Button>
            )}

            {step === 'nfts' && (
              <Button
                onClick={() => setStep('tokens')}
                disabled={selectedNFTs.length === 0}
                className="flex-1 bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 text-white font-semibold disabled:opacity-50"
              >
                Continue ({selectedNFTs.length} selected)
              </Button>
            )}

            {step === 'tokens' && (
              <Button
                onClick={() => setStep('perks')}
                className="flex-1 bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 text-white font-semibold"
              >
                Continue
              </Button>
            )}

            {step === 'perks' && (
              <Button
                onClick={() => setStep('price')}
                className="flex-1 bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 text-white font-semibold"
              >
                Set Price
              </Button>
            )}

            {step === 'price' && (
              <Button
                onClick={() => setStep('confirm')}
                disabled={!bundlePrice || parseFloat(bundlePrice) <= 0}
                className="flex-1 bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 text-white font-semibold disabled:opacity-50"
              >
                Review Bundle
              </Button>
            )}

            {step === 'confirm' && (
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting || !account}
                className="flex-1 bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 text-white font-semibold disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                    Creating Bundle...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Bundle
                  </>
                )}
              </Button>
            )}
          </div>
        </Card>
      </div>
    </div>
  )

  if (typeof window === 'undefined') return null
  return createPortal(modalContent, document.body)
}
