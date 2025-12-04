import React, { useState } from 'react'
import { Card, CardContent, CardHeader } from '../ui/card'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Heart, RotateCcw, ShoppingCart } from 'lucide-react'

interface NFTCardProps {
  nft: {
    id: string
    name: string
    collection: string
    tokenId: string
    chainId: number
    price: { value: number; currency: string }
    usdPrice: number
    image: string
    rarity: 'common' | 'rare' | 'epic' | 'legendary'
    attributes: { trait_type: string; value: string | number }[]
    creator: string
    owner: string
  }
  onPurchase: (nftId: string) => void
  isWalletConnected: boolean
  listView?: boolean
}

const chainNames: { [key: number]: string } = {
  1: 'Ethereum', 137: 'Polygon', 56: 'BSC', 101: 'Solana', 250: 'Fantom',
  43114: 'Avalanche', 7000: 'ZetaChain', 8453: 'Base', 1284: 'Moonbeam',
  25: 'Cronos', 100: 'Gnosis', 128: 'Heco', 1442: 'Polygon zkEVM',
  784: 'Sui', 415: 'Hedera', 60: 'GoChain', 2: 'Litecoin', 1839: 'Bitcoin'
}

export const NFTCard: React.FC<NFTCardProps> = ({ nft, onPurchase, isWalletConnected, listView = false }) => {
  const [isFlipped, setIsFlipped] = useState(false)

  const formatNumber = (num: number) => {
    if (num < 0.001) return num.toFixed(6)
    if (num < 1) return num.toFixed(4)
    if (num < 1000) return num.toFixed(2)
    if (num < 1000000) return `${(num / 1000).toFixed(1)}K`
    return `${(num / 1000000).toFixed(1)}M`
  }

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'legendary': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
      case 'epic': return 'bg-purple-500/20 text-purple-400 border-purple-500/30'
      case 'rare': return 'bg-blue-500/20 text-blue-400 border-blue-500/30'
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30'
    }
  }

  const shortenAddress = (address: string) => `${address.slice(0, 6)}...${address.slice(-4)}`

  const getRarityScore = (rarity: string) => {
    switch (rarity) {
      case 'legendary': return 95
      case 'epic': return 78
      case 'rare': return 45
      default: return 15
    }
  }

  if (listView) {
    return (
      <Card className="retro-card transition-all duration-200 hover:border-cyan-400/50">
        <CardContent className="p-4">
          <div className="flex items-center justify-between space-x-4">
            <div className="flex items-center space-x-4 flex-1">
              <div className="w-16 h-16 bg-gray-700 rounded-lg overflow-hidden flex-shrink-0 relative">
                <img src={nft.image} alt={nft.name} className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 mb-1">
                  <h3 className="retro-text text-white truncate">{nft.name}</h3>
                  <Badge className={getRarityColor(nft.rarity)}>{nft.rarity}</Badge>
                </div>
                <div className="text-sm text-gray-400 truncate">{nft.collection}</div>
                <div className="retro-json text-xs">
                  Token ID: {nft.tokenId} • {chainNames[nft.chainId] || `Chain ${nft.chainId}`}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="retro-text text-white">{formatNumber(nft.price.value)} {nft.price.currency}</div>
              <div className="text-sm text-gray-400">≈ ${formatNumber(nft.usdPrice)}</div>
            </div>
            <Button onClick={() => onPurchase(nft.id)} disabled={!isWalletConnected} size="sm" className="retro-button">
              {isWalletConnected ? 'Buy Now' : 'Connect'}
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="nft-flip-card-container cursor-pointer" onClick={() => setIsFlipped(!isFlipped)}>
      <div className={`nft-flip-card ${isFlipped ? 'flipped' : ''}`}>
        {/* Front Side - Rarible-style compact */}
        <div className="nft-flip-card-front">
          <Card className="retro-card transition-all duration-200 hover:scale-[1.02] h-full border-0 bg-gray-900/80 rounded-xl overflow-hidden">
            <div className="flip-hint"><RotateCcw className="w-2.5 h-2.5" /></div>
            {/* Image takes most of card - Rarible style */}
            <div className="aspect-square bg-gray-800 overflow-hidden relative">
              <img src={nft.image} alt={nft.name} className="w-full h-full object-cover" loading="lazy" />
              {/* Rarity badge overlay */}
              <Badge className={`${getRarityColor(nft.rarity)} absolute top-1.5 right-1.5 text-[10px] px-1.5 py-0.5`}>{nft.rarity}</Badge>
            </div>
            {/* Compact info section */}
            <div className="p-2 space-y-1">
              <h3 className="text-white text-xs font-semibold truncate leading-tight">{nft.name}</h3>
              <p className="text-gray-400 text-[10px] truncate">{nft.collection}</p>
              <div className="flex items-center justify-between pt-1">
                <div>
                  <div className="text-white text-xs font-bold">{formatNumber(nft.price.value)} {nft.price.currency}</div>
                  <div className="text-[9px] text-gray-500">${formatNumber(nft.usdPrice)}</div>
                </div>
                <Button
                  onClick={(e) => { e.stopPropagation(); onPurchase(nft.id) }}
                  disabled={!isWalletConnected}
                  size="sm"
                  className="h-6 px-2 text-[10px] bg-cyan-500 hover:bg-cyan-600 text-black font-bold rounded-md"
                >
                  Buy
                </Button>
              </div>
            </div>
          </Card>
        </div>

        {/* Back Side */}
        <div className="nft-flip-card-back">
          <div className="p-4 h-full flex flex-col text-white">
            <div className="flip-hint"><RotateCcw className="w-3 h-3" /></div>
            <div className="retro-title text-center mb-4 text-sm">NFT_METADATA.JSON</div>
            <div className="flex-1 overflow-y-auto space-y-3">
              <div className="metadata-section">
                <div className="metadata-label">COLLECTION_INFO</div>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs"><span className="text-gray-400">NAME:</span><span className="metadata-value text-xs">{nft.collection}</span></div>
                  <div className="flex justify-between text-xs"><span className="text-gray-400">TOKEN_ID:</span><span className="metadata-value">{nft.tokenId}</span></div>
                  <div className="flex justify-between text-xs"><span className="text-gray-400">STANDARD:</span><span className="metadata-value">ERC-721</span></div>
                </div>
              </div>
              <div className="metadata-section">
                <div className="metadata-label">RARITY_ANALYSIS</div>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs"><span className="text-gray-400">TIER:</span><span className="metadata-value uppercase">{nft.rarity}</span></div>
                  <div className="flex justify-between text-xs"><span className="text-gray-400">SCORE:</span><span className="metadata-value">{getRarityScore(nft.rarity)}/100</span></div>
                </div>
              </div>
              <div className="metadata-section">
                <div className="metadata-label">ATTRIBUTES</div>
                <div className="space-y-1">
                  {nft.attributes.map((attr, index) => (
                    <div key={index} className="flex justify-between text-xs">
                      <span className="text-gray-400">{attr.trait_type.toUpperCase()}:</span>
                      <span className="metadata-value text-xs">{attr.value}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="metadata-section">
                <div className="metadata-label">OWNERSHIP</div>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs"><span className="text-gray-400">CREATOR:</span><span className="metadata-value text-xs">{shortenAddress(nft.creator)}</span></div>
                  <div className="flex justify-between text-xs"><span className="text-gray-400">OWNER:</span><span className="metadata-value text-xs">{shortenAddress(nft.owner)}</span></div>
                </div>
              </div>
            </div>
            <div className="mt-4">
              <Button onClick={(e) => { e.stopPropagation(); onPurchase(nft.id) }} disabled={!isWalletConnected} className="w-full retro-button">
                <ShoppingCart className="w-4 h-4 mr-2" />
                {isWalletConnected ? 'ACQUIRE_NFT' : 'CONNECT_WALLET'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
