import React, { useState } from 'react'
import { Card, CardContent, CardHeader } from '../ui/card'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Package, RotateCcw, ShoppingBag, Database } from 'lucide-react'

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
      <Card className="retro-card transition-all duration-200 hover:border-cyan-400/50">
        <CardContent className="p-4">
          <div className="flex items-center justify-between space-x-4">
            <div className="flex items-center space-x-4 flex-1">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center text-2xl analog-glow">
                {getAssetIcon()}
              </div>
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-1">
                  <h3 className="retro-text text-white">Bundle #{bundle.id}</h3>
                  <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">
                    <Package className="w-3 h-3 mr-1" />Bundle
                  </Badge>
                </div>
                <div className="text-sm text-gray-400">
                  {bundle.nftIds.length} NFTs • {bundle.privateAsset} • {chainNames[bundle.chainId]}
                </div>
                <div className="retro-json text-xs">ISRC: {bundle.ISRC}</div>
              </div>
            </div>
            <div className="text-right">
              <div className="retro-text text-white">{formatNumber(bundle.price.value)} {bundle.price.currency}</div>
              <div className="text-sm text-gray-400">≈ ${formatNumber(bundle.usdPrice)}</div>
            </div>
            <Button onClick={() => onPurchase(bundle.id)} size="sm" className="retro-button">Buy Bundle</Button>
          </div>
        </CardContent>
      </Card>
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
                <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">
                  <Package className="w-3 h-3 mr-1" />Bundle
                </Badge>
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
