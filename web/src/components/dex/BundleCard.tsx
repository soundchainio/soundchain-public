import React, { useState } from 'react'
import { Card, CardContent, CardHeader } from '../ui/card'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Package, RotateCcw, ShoppingBag, Database, Zap } from 'lucide-react'

interface BundleCardProps {
  bundle: {
    id: string
    nftIds: string[]
    tokenSymbol: string
    tokenAmount: number
    chainId: number
    privateAsset?: string
    price: { value: number; currency: string }
    usdPrice: number
    ISRC: string
  }
  onPurchase: (bundleId: string) => void
  listView?: boolean
}

const chainNames: { [key: number]: string } = {
  1: 'Ethereum', 137: 'Polygon', 56: 'BSC', 101: 'Solana', 250: 'Fantom',
  43114: 'Avalanche', 7000: 'ZetaChain', 8453: 'Base', 1284: 'Moonbeam'
}

export const BundleCard: React.FC<BundleCardProps> = ({ bundle, onPurchase, listView = false }) => {
  const [isFlipped, setIsFlipped] = useState(false)

  const formatNumber = (num: number) => {
    if (num < 0.001) return num.toFixed(6)
    if (num < 1) return num.toFixed(4)
    if (num < 1000) return num.toFixed(2)
    if (num < 1000000) return `${(num / 1000).toFixed(1)}K`
    return `${(num / 1000000).toFixed(1)}M`
  }

  const getAssetIcon = () => {
    switch (bundle.privateAsset) {
      case 'concert tickets': return '🎵'
      case 'movie tickets': return '🎬'
      case 'sporting event tickets': return '🏆'
      case 'vinyl': return '📀'
      case 'homes': return '🏠'
      case 'cars': return '🚗'
      case 'clothing': return '👕'
      default: return '📦'
    }
  }

  const getAssetUtilities = (assetType: string) => {
    switch (assetType) {
      case 'concert tickets': return ['VIP Access', 'Meet & Greet', 'Exclusive Merch']
      case 'movie tickets': return ['Premium Screening', 'Director Commentary', 'Behind Scenes']
      case 'vinyl': return ['Limited Edition', 'Signed Copy', 'Digital Download']
      default: return ['Exclusive Access', 'Utility Rights', 'Special Benefits']
    }
  }

  if (listView) {
    return (
      <div className="flex items-center gap-3 px-3 py-2 bg-gray-900/50 hover:bg-gray-800/50 border-b border-gray-800/50 transition-colors group">
        {/* Bundle Icon */}
        <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center text-lg flex-shrink-0">
          {getAssetIcon()}
        </div>

        {/* Bundle Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-white">Bundle #{bundle.id}</span>
            <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30 text-[10px] px-1.5 py-0">
              <Package className="w-2.5 h-2.5 mr-0.5" />{bundle.nftIds.length} NFTs
            </Badge>
          </div>
          <div className="text-xs text-gray-400 capitalize">{bundle.privateAsset || 'No perks'}</div>
        </div>

        {/* Token allocation - hidden on mobile */}
        <div className="hidden sm:block w-24 text-xs text-gray-400 text-right flex-shrink-0">
          {bundle.tokenAmount > 0 ? `${formatNumber(bundle.tokenAmount)} ${bundle.tokenSymbol}` : '—'}
        </div>

        {/* Price */}
        <div className="w-24 text-right flex-shrink-0">
          <div className="text-sm font-semibold text-green-400">{formatNumber(bundle.price.value)} {bundle.price.currency}</div>
          <div className="text-[10px] text-gray-500">≈ ${formatNumber(bundle.usdPrice)}</div>
        </div>

        {/* Buy Button */}
        <button
          onClick={() => onPurchase(bundle.id)}
          className="px-3 py-1.5 bg-purple-500 hover:bg-purple-600 text-white text-xs font-semibold rounded transition-colors flex-shrink-0"
        >
          Buy
        </button>
      </div>
    )
  }

  return (
    <div className="flip-card-container cursor-pointer" onClick={() => setIsFlipped(!isFlipped)}>
      <div className={`flip-card ${isFlipped ? 'flipped' : ''}`}>
        {/* Front Side */}
        <div className="flip-card-front">
          <Card className="retro-card transition-all duration-200 hover:scale-105 h-full">
            <div className="flip-hint"><RotateCcw className="w-3 h-3" /></div>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center text-xl analog-glow">
                    {getAssetIcon()}
                  </div>
                  <div>
                    <h3 className="retro-title text-sm">Bundle #{bundle.id}</h3>
                    <p className="retro-json text-xs">{chainNames[bundle.chainId]}</p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">
                    <Package className="w-3 h-3 mr-1" />Bundle
                  </Badge>
                  <Badge className="bg-gradient-to-r from-cyan-500/80 to-purple-500/80 text-white text-[8px] px-1.5 py-0.5">
                    <Zap className="w-2 h-2 mr-0.5" /> L2
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-3">
                <div className="metadata-section">
                  <div className="metadata-label">Contents</div>
                  <div className="metadata-value">{bundle.nftIds.length} NFTs</div>
                  <div className="text-sm text-gray-400 capitalize">{bundle.privateAsset}</div>
                </div>
                <div className="metadata-section">
                  <div className="metadata-label">NFT IDs</div>
                  <div className="flex flex-wrap gap-1">
                    {bundle.nftIds.slice(0, 3).map((nftId) => (
                      <span key={nftId} className="metadata-attribute">{nftId}</span>
                    ))}
                    {bundle.nftIds.length > 3 && (
                      <span className="metadata-attribute">+{bundle.nftIds.length - 3}</span>
                    )}
                  </div>
                </div>
                <div className="metadata-section">
                  <div className="metadata-label">Price</div>
                  <div className="metadata-value">{formatNumber(bundle.price.value)} {bundle.price.currency}</div>
                  <div className="text-sm text-gray-400">≈ ${formatNumber(bundle.usdPrice)} USD</div>
                </div>
                <div className="metadata-section">
                  <div className="metadata-label">Tokens</div>
                  <div className="metadata-value">{formatNumber(bundle.tokenAmount)} {bundle.tokenSymbol}</div>
                </div>
                <Button onClick={(e) => { e.stopPropagation(); onPurchase(bundle.id) }} className="w-full retro-button">
                  <Package className="w-4 h-4 mr-2" />Buy Bundle
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Back Side */}
        <div className="flip-card-back">
          <div className="p-4 h-full flex flex-col text-white">
            <div className="flip-hint"><RotateCcw className="w-3 h-3" /></div>
            <div className="retro-title text-center mb-4 text-sm">BUNDLE_MANIFEST.JSON</div>
            <div className="flex-1 overflow-y-auto space-y-3">
              <div className="metadata-section">
                <div className="metadata-label">BUNDLE_OVERVIEW</div>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs"><span className="text-gray-400">TYPE:</span><span className="metadata-value">Premium Collection</span></div>
                  <div className="flex justify-between text-xs"><span className="text-gray-400">TIER:</span><span className="metadata-value">Gold</span></div>
                  <div className="flex justify-between text-xs"><span className="text-gray-400">EXCLUSIVITY:</span><span className="metadata-value">Limited Edition</span></div>
                </div>
              </div>
              <div className="metadata-section">
                <div className="metadata-label">VALUE_ANALYSIS</div>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs"><span className="text-gray-400">TOTAL VALUE:</span><span className="metadata-value">${formatNumber(bundle.usdPrice * 1.2)}</span></div>
                  <div className="flex justify-between text-xs"><span className="text-gray-400">BUNDLE PRICE:</span><span className="metadata-value">${formatNumber(bundle.usdPrice)}</span></div>
                  <div className="flex justify-between text-xs"><span className="text-gray-400">SAVINGS:</span><span className="metadata-value text-green-400">${formatNumber(bundle.usdPrice * 0.2)}</span></div>
                </div>
              </div>
              <div className="metadata-section">
                <div className="metadata-label">NFT_COLLECTION</div>
                <div className="space-y-1">
                  {bundle.nftIds.map((id, index) => (
                    <div key={index} className="flex justify-between text-xs">
                      <span className="text-gray-400">NFT #{id}:</span>
                      <span className="metadata-value text-xs">{['LEGENDARY', 'EPIC', 'RARE', 'COMMON'][index % 4]}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="metadata-section">
                <div className="metadata-label">UTILITIES</div>
                <div className="flex flex-wrap gap-1">
                  {getAssetUtilities(bundle.privateAsset || '').map((utility, index) => (
                    <span key={index} className="metadata-attribute text-xs">{utility}</span>
                  ))}
                </div>
              </div>
              <div className="metadata-section">
                <div className="metadata-label">TOKEN_ALLOCATION</div>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs"><span className="text-gray-400">SYMBOL:</span><span className="metadata-value">{bundle.tokenSymbol}</span></div>
                  <div className="flex justify-between text-xs"><span className="text-gray-400">AMOUNT:</span><span className="metadata-value">{formatNumber(bundle.tokenAmount)}</span></div>
                  <div className="flex justify-between text-xs"><span className="text-gray-400">BLOCKCHAIN:</span><span className="metadata-value">{chainNames[bundle.chainId]}</span></div>
                </div>
              </div>
            </div>
            <div className="mt-4">
              <Button onClick={(e) => { e.stopPropagation(); onPurchase(bundle.id) }} className="w-full retro-button">
                <ShoppingBag className="w-4 h-4 mr-2" />ACQUIRE_BUNDLE
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
