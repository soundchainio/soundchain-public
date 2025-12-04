import React, { useState } from 'react'
import { Card, CardContent, CardHeader } from '../ui/card'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Clock, Zap, RotateCcw, TrendingUp, Shield, Database } from 'lucide-react'

interface TokenCardProps {
  token: {
    id: string
    tokenSymbol: string
    tokenAmount: number
    chainId: number
    price: { value: number; currency: string }
    usdPrice: number
    ISRC: string
    saleType: 'fixed' | 'auction' | 'bundle'
    acceptedCurrencies: string[]
  }
  onPurchase: (tokenId: string) => void
  isWalletConnected: boolean
  listView?: boolean
}

const chainNames: { [key: number]: string } = {
  1: 'Ethereum', 137: 'Polygon', 56: 'BSC', 101: 'Solana', 250: 'Fantom',
  43114: 'Avalanche', 7000: 'ZetaChain', 8453: 'Base', 1284: 'Moonbeam',
  25: 'Cronos', 100: 'Gnosis', 128: 'Heco', 1442: 'Polygon zkEVM'
}

export const TokenCard: React.FC<TokenCardProps> = ({ token, onPurchase, isWalletConnected, listView = false }) => {
  const [isFlipped, setIsFlipped] = useState(false)

  const formatNumber = (num: number) => {
    if (num < 0.001) return num.toFixed(6)
    if (num < 1) return num.toFixed(4)
    if (num < 1000) return num.toFixed(2)
    if (num < 1000000) return `${(num / 1000).toFixed(1)}K`
    return `${(num / 1000000).toFixed(1)}M`
  }

  const getSaleTypeIcon = (saleType: string) => {
    switch (saleType) {
      case 'auction': return <Clock className="w-4 h-4" />
      case 'fixed': return <Zap className="w-4 h-4" />
      default: return <Database className="w-4 h-4" />
    }
  }

  const getSaleTypeColor = (saleType: string) => {
    switch (saleType) {
      case 'auction': return 'bg-orange-500/20 text-orange-400 border-orange-500/30'
      case 'fixed': return 'bg-green-500/20 text-green-400 border-green-500/30'
      default: return 'bg-blue-500/20 text-blue-400 border-blue-500/30'
    }
  }

  if (listView) {
    return (
      <Card className="retro-card transition-all duration-200 hover:border-cyan-400/50">
        <CardContent className="p-4">
          <div className="flex items-center justify-between space-x-4">
            <div className="flex items-center space-x-4 flex-1">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center retro-text font-bold">
                {token.tokenSymbol.substring(0, 2)}
              </div>
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-1">
                  <h3 className="retro-text text-white">{token.tokenSymbol}</h3>
                  <Badge className={getSaleTypeColor(token.saleType)}>
                    {getSaleTypeIcon(token.saleType)}
                    <span className="ml-1 capitalize">{token.saleType}</span>
                  </Badge>
                </div>
                <div className="text-sm text-gray-400">
                  {formatNumber(token.tokenAmount)} tokens • {chainNames[token.chainId] || `Chain ${token.chainId}`}
                </div>
                <div className="retro-json text-xs">ISRC: {token.ISRC}</div>
              </div>
            </div>
            <div className="text-right">
              <div className="retro-text text-white">{formatNumber(token.price.value)} {token.price.currency}</div>
              <div className="text-sm text-gray-400">≈ ${formatNumber(token.usdPrice)}</div>
            </div>
            <Button onClick={() => onPurchase(token.id)} disabled={!isWalletConnected} size="sm" className="retro-button">
              {isWalletConnected ? 'Buy Now' : 'Connect'}
            </Button>
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
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center retro-text analog-glow font-bold">
                    {token.tokenSymbol.substring(0, 2)}
                  </div>
                  <div>
                    <h3 className="retro-title text-sm">{token.tokenSymbol}</h3>
                    <p className="retro-json text-xs">{chainNames[token.chainId] || `Chain ${token.chainId}`}</p>
                  </div>
                </div>
                <Badge className={getSaleTypeColor(token.saleType)}>
                  {getSaleTypeIcon(token.saleType)}
                  <span className="ml-1 capitalize">{token.saleType}</span>
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-4">
                <div className="metadata-section">
                  <div className="metadata-label">Amount</div>
                  <div className="metadata-value">{formatNumber(token.tokenAmount)} tokens</div>
                </div>
                <div className="metadata-section">
                  <div className="metadata-label">Price</div>
                  <div className="metadata-value">{formatNumber(token.price.value)} {token.price.currency}</div>
                  <div className="text-sm text-gray-400">≈ ${formatNumber(token.usdPrice)} USD</div>
                </div>
                <div className="metadata-section">
                  <div className="metadata-label">ISRC</div>
                  <div className="retro-json text-xs">{token.ISRC}</div>
                </div>
                <div className="metadata-section">
                  <div className="metadata-label">Accepted</div>
                  <div className="flex flex-wrap gap-1">
                    {token.acceptedCurrencies.slice(0, 3).map((currency) => (
                      <span key={currency} className="metadata-attribute">{currency}</span>
                    ))}
                    {token.acceptedCurrencies.length > 3 && (
                      <span className="metadata-attribute">+{token.acceptedCurrencies.length - 3}</span>
                    )}
                  </div>
                </div>
                <Button onClick={(e) => { e.stopPropagation(); onPurchase(token.id) }} disabled={!isWalletConnected} className="w-full retro-button">
                  {isWalletConnected ? 'Buy Now' : 'Connect Wallet'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Back Side */}
        <div className="flip-card-back">
          <div className="p-4 h-full flex flex-col text-white">
            <div className="flip-hint"><RotateCcw className="w-3 h-3" /></div>
            <div className="retro-title text-center mb-4 text-sm">TOKEN_METADATA.JSON</div>
            <div className="flex-1 overflow-y-auto space-y-3">
              <div className="metadata-section">
                <div className="metadata-label">TECHNICAL_SPECS</div>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs"><span className="text-gray-400">SYMBOL:</span><span className="metadata-value">{token.tokenSymbol}</span></div>
                  <div className="flex justify-between text-xs"><span className="text-gray-400">DECIMALS:</span><span className="metadata-value">18</span></div>
                  <div className="flex justify-between text-xs"><span className="text-gray-400">CHAIN:</span><span className="metadata-value">{chainNames[token.chainId]}</span></div>
                </div>
              </div>
              <div className="metadata-section">
                <div className="metadata-label">TRADING_DATA</div>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs"><span className="text-gray-400">SALE TYPE:</span><span className="metadata-value uppercase">{token.saleType}</span></div>
                  <div className="flex justify-between text-xs"><span className="text-gray-400">AMOUNT:</span><span className="metadata-value">{formatNumber(token.tokenAmount)}</span></div>
                  <div className="flex justify-between text-xs"><span className="text-gray-400">USD VALUE:</span><span className="metadata-value">${formatNumber(token.usdPrice)}</span></div>
                </div>
              </div>
              <div className="metadata-section">
                <div className="metadata-label">ACCEPTED_CURRENCIES</div>
                <div className="flex flex-wrap gap-1">
                  {token.acceptedCurrencies.map((currency) => (
                    <span key={currency} className="metadata-attribute">{currency}</span>
                  ))}
                </div>
              </div>
              <div className="metadata-section">
                <div className="metadata-label">SECURITY_STATUS</div>
                <div className="flex items-center space-x-2">
                  <Shield className="w-4 h-4 text-green-400" />
                  <span className="text-green-400 text-xs">Verified</span>
                  <Zap className="w-4 h-4 text-yellow-400" />
                  <span className="text-yellow-400 text-xs">Liquidity Locked</span>
                </div>
              </div>
            </div>
            <div className="mt-4">
              <Button onClick={(e) => { e.stopPropagation(); onPurchase(token.id) }} disabled={!isWalletConnected} className="w-full retro-button">
                <TrendingUp className="w-4 h-4 mr-2" />
                {isWalletConnected ? 'EXECUTE_TRADE' : 'CONNECT_WALLET'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
