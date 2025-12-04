import React, { useState } from 'react';
import { Card, CardContent, CardHeader } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { ExternalLink, Zap, Clock, RotateCcw, TrendingUp, Shield, Database, Expand } from 'lucide-react';

interface TokenCardProps {
  token: {
    id: string;
    tokenSymbol: string;
    tokenAmount: number;
    chainId: number;
    price: {
      value: number;
      currency: string;
    };
    usdPrice: number;
    ISRC: string;
    saleType: 'fixed' | 'auction' | 'bundle';
    acceptedCurrencies: string[];
  };
  onPurchase: (tokenId: string) => void;
  isWalletConnected: boolean;
  listView?: boolean;
  onShowDetails?: (token: any, type: 'nft' | 'token' | 'bundle') => void;
  onImageClick?: (src: string, alt: string, title?: string, metadata?: any) => void;
}

const chainNames: { [key: number]: string } = {
  1: 'Ethereum',
  137: 'Polygon',
  56: 'BSC',
  101: 'Solana',
  250: 'Fantom',
  43114: 'Avalanche',
  7000: 'Zetachain',
  8455: 'Base',
  1284: 'Moonbeam',
  25: 'Cronos',
  100: 'Gnosis',
  128: 'Heco',
  1442: 'Polygon zkEVM',
  784: 'Sui',
  415: 'Hedera',
  60: 'GoChain',
  2: 'Litecoin',
  1839: 'Bitcoin'
};

export const TokenCard: React.FC<TokenCardProps> = ({ 
  token, 
  onPurchase, 
  isWalletConnected,
  listView = false,
  onShowDetails,
  onImageClick 
}) => {
  const [isFlipped, setIsFlipped] = useState(false);

  const formatNumber = (num: number) => {
    if (num < 0.000001) return num.toExponential(2);
    if (num < 0.001) return num.toFixed(6);
    if (num < 1) return num.toFixed(4);
    if (num < 1000) return num.toFixed(2);
    if (num < 1000000) return `${(num / 1000).toFixed(1)}K`;
    return `${(num / 1000000).toFixed(1)}M`;
  };

  const getSaleTypeIcon = (saleType: string) => {
    switch (saleType) {
      case 'auction':
        return <Clock className="w-4 h-4" />;
      case 'fixed':
        return <Zap className="w-4 h-4" />;
      default:
        return <ExternalLink className="w-4 h-4" />;
    }
  };

  const getSaleTypeColor = (saleType: string) => {
    switch (saleType) {
      case 'auction':
        return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      case 'fixed':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      default:
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    }
  };

  const mockMetadata = {
    contractAddress: '0x' + token.id.padStart(40, '0'),
    decimals: 18,
    totalSupply: 1000000,
    marketCap: token.usdPrice * 1000000,
    volume24h: token.usdPrice * 15000,
    circulatingSupply: 850000,
    launchDate: '2024-01-15',
    auditStatus: 'Verified',
    liquidityLocked: true,
    utility: ['Governance', 'Staking', 'Trading'],
    royaltyPercentage: 2.5
  };

  const handleCardClick = () => {
    if (!listView) {
      setIsFlipped(!isFlipped);
    }
  };

  const handleButtonClick = (e: React.MouseEvent, action: () => void) => {
    e.stopPropagation();
    action();
  };

  const handleImageClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onImageClick) {
      // Generate a token icon image for full-screen viewing
      const canvas = document.createElement('canvas');
      canvas.width = 400;
      canvas.height = 400;
      const ctx = canvas.getContext('2d');
      
      if (ctx) {
        // Create gradient background
        const gradient = ctx.createLinearGradient(0, 0, 400, 400);
        gradient.addColorStop(0, '#3b82f6');
        gradient.addColorStop(1, '#8b5cf6');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 400, 400);
        
        // Add token symbol
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 120px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(token.tokenSymbol, 200, 200);
        
        // Convert to data URL
        const dataURL = canvas.toDataURL();
        
        onImageClick(
          dataURL,
          `${token.tokenSymbol} Token`,
          `${token.tokenSymbol} Token`,
          {
            tokenSymbol: token.tokenSymbol,
            chain: chainNames[token.chainId] || `Chain ${token.chainId}`,
            amount: token.tokenAmount,
            saleType: token.saleType
          }
        );
      }
    }
  };

  if (listView) {
    return (
      <Card className="retro-card transition-all duration-200">
        <CardContent className="p-4">
          <div className="flex items-center justify-between space-x-4">
            <div className="flex items-center space-x-4 flex-1">
              <div 
                className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center retro-text relative group cursor-pointer"
                onClick={handleImageClick}
              >
                {token.tokenSymbol.substring(0, 2)}
                {onImageClick && (
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-lg flex items-center justify-center">
                    <Expand className="w-4 h-4 text-soundchain-accent" />
                  </div>
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-1">
                  <h3 className="retro-text text-white">{token.tokenSymbol}</h3>
                  <Badge className={`text-xs ${getSaleTypeColor(token.saleType)}`}>
                    {getSaleTypeIcon(token.saleType)}
                    <span className="ml-1 capitalize">{token.saleType}</span>
                  </Badge>
                </div>
                <div className="text-sm text-gray-400">
                  {formatNumber(token.tokenAmount)} tokens • {chainNames[token.chainId] || `Chain ${token.chainId}`}
                </div>
                <div className="retro-json text-xs">
                  ISRC: {token.ISRC}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="retro-text text-white">
                {formatNumber(token.price.value)} {token.price.currency}
              </div>
              <div className="text-sm text-gray-400">
                ≈ ${formatNumber(token.usdPrice)}
              </div>
            </div>
            <div className="flex flex-col space-y-2">
              <Button
                onClick={() => onPurchase(token.id)}
                disabled={!isWalletConnected}
                size="sm"
                className="retro-button"
              >
                {isWalletConnected ? 'Buy Now' : 'Connect Wallet'}
              </Button>
              <div className="flex space-x-1">
                {onImageClick && (
                  <Button
                    onClick={handleImageClick}
                    size="sm"
                    variant="outline"
                    className="soundchain-button-outline flex-1"
                    title="View full-screen token icon"
                  >
                    <Expand className="w-4 h-4" />
                  </Button>
                )}
                {onShowDetails && (
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      onShowDetails(token, 'token');
                    }}
                    size="sm"
                    variant="outline"
                    className="soundchain-button-outline flex-1"
                    title="View Web3 details"
                  >
                    <Database className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flip-card-container" onClick={handleCardClick}>
      <div className={`flip-card ${isFlipped ? 'flipped' : ''}`}>
        {/* Front Side */}
        <div className="flip-card-front">
          <Card className="retro-card transition-all duration-200 hover:scale-105 h-full">
            <div className="flip-hint">
              <RotateCcw className="w-3 h-3" />
            </div>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div 
                    className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center retro-text analog-glow relative group cursor-pointer"
                    onClick={handleImageClick}
                  >
                    {token.tokenSymbol.substring(0, 2)}
                    {onImageClick && (
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-lg flex items-center justify-center">
                        <Expand className="w-4 h-4 text-soundchain-accent" />
                      </div>
                    )}
                  </div>
                  <div>
                    <h3 className="retro-title text-sm">{token.tokenSymbol}</h3>
                    <p className="retro-json text-xs">{chainNames[token.chainId] || `Chain ${token.chainId}`}</p>
                  </div>
                </div>
                <Badge className={`text-xs ${getSaleTypeColor(token.saleType)}`}>
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
                  <div className="metadata-value">
                    {formatNumber(token.price.value)} {token.price.currency}
                  </div>
                  <div className="text-sm text-gray-400">
                    ≈ ${formatNumber(token.usdPrice)} USD
                  </div>
                </div>

                <div className="metadata-section">
                  <div className="metadata-label">ISRC</div>
                  <div className="retro-json text-xs">
                    {token.ISRC}
                  </div>
                </div>

                <div className="metadata-section">
                  <div className="metadata-label">Accepted Currencies</div>
                  <div className="flex flex-wrap gap-1">
                    {token.acceptedCurrencies.slice(0, 3).map((currency) => (
                      <span key={currency} className="metadata-attribute">
                        {currency}
                      </span>
                    ))}
                    {token.acceptedCurrencies.length > 3 && (
                      <span className="metadata-attribute">
                        +{token.acceptedCurrencies.length - 3}
                      </span>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Button
                    onClick={(e) => handleButtonClick(e, () => onPurchase(token.id))}
                    disabled={!isWalletConnected}
                    className="w-full retro-button"
                  >
                    {isWalletConnected ? 'Buy Now' : 'Connect Wallet'}
                  </Button>
                  <div className="flex space-x-1">
                    {onImageClick && (
                      <Button
                        onClick={(e) => handleButtonClick(e, () => handleImageClick(e))}
                        className="flex-1 soundchain-button-outline"
                        variant="outline"
                        size="sm"
                        title="View full-screen token icon"
                      >
                        <Expand className="w-4 h-4" />
                      </Button>
                    )}
                    {onShowDetails && (
                      <Button
                        onClick={(e) => handleButtonClick(e, () => onShowDetails(token, 'token'))}
                        className="flex-1 soundchain-button-outline"
                        variant="outline"
                        size="sm"
                      >
                        <Database className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Back Side - TrackMetadataForm Style */}
        <div className="flip-card-back">
          <div className="p-4 h-full flex flex-col text-white">
            <div className="flip-hint">
              <RotateCcw className="w-3 h-3" />
            </div>
            
            <div className="retro-title text-center mb-4 text-sm">
              TOKEN_METADATA.JSON
            </div>

            <div className="flex-1 overflow-y-auto space-y-3">
              {/* Technical Specs */}
              <div className="metadata-section">
                <div className="metadata-label">TECHNICAL_SPECS</div>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400">CONTRACT:</span>
                    <span className="metadata-value text-xs">{mockMetadata.contractAddress.slice(0, 10)}...</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400">DECIMALS:</span>
                    <span className="metadata-value">{mockMetadata.decimals}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400">CHAIN:</span>
                    <span className="metadata-value">{chainNames[token.chainId]}</span>
                  </div>
                </div>
              </div>

              {/* Trading Info */}
              <div className="metadata-section">
                <div className="metadata-label">TRADING_DATA</div>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400">MARKET CAP:</span>
                    <span className="metadata-value">${formatNumber(mockMetadata.marketCap)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400">24H VOLUME:</span>
                    <span className="metadata-value">${formatNumber(mockMetadata.volume24h)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400">SUPPLY:</span>
                    <span className="metadata-value">{formatNumber(mockMetadata.circulatingSupply)}</span>
                  </div>
                </div>
              </div>

              {/* Utility & Features */}
              <div className="metadata-section">
                <div className="metadata-label">UTILITIES</div>
                <div className="flex flex-wrap gap-1">
                  {mockMetadata.utility.map((util, index) => (
                    <span key={index} className="metadata-attribute">
                      {util}
                    </span>
                  ))}
                </div>
              </div>

              {/* Payment Methods */}
              <div className="metadata-section">
                <div className="metadata-label">ACCEPTED_CURRENCIES</div>
                <div className="flex flex-wrap gap-1">
                  {token.acceptedCurrencies.map((currency) => (
                    <span key={currency} className="metadata-attribute">
                      {currency}
                    </span>
                  ))}
                </div>
              </div>

              {/* Security */}
              <div className="metadata-section">
                <div className="metadata-label">SECURITY_STATUS</div>
                <div className="flex items-center space-x-2">
                  <Shield className="w-4 h-4 text-green-400" />
                  <span className="text-green-400 text-xs">{mockMetadata.auditStatus}</span>
                  {mockMetadata.liquidityLocked && (
                    <>
                      <Zap className="w-4 h-4 text-yellow-400" />
                      <span className="text-yellow-400 text-xs">Liquidity Locked</span>
                    </>
                  )}
                </div>
              </div>

              {/* JSON Metadata */}
              <div className="metadata-section">
                <div className="metadata-label">RAW_METADATA</div>
                <div className="metadata-json text-xs">
{`{
  "token_id": "${token.id}",
  "symbol": "${token.tokenSymbol}",
  "chain_id": ${token.chainId},
  "contract": "${mockMetadata.contractAddress}",
  "decimals": ${mockMetadata.decimals},
  "sale_type": "${token.saleType}",
  "isrc": "${token.ISRC}",
  "audit_status": "${mockMetadata.auditStatus}",
  "liquidity_locked": ${mockMetadata.liquidityLocked}
}`}
                </div>
              </div>
            </div>

            {/* Purchase Button */}
            <div className="mt-4">
              <Button
                onClick={(e) => handleButtonClick(e, () => onPurchase(token.id))}
                disabled={!isWalletConnected}
                className="w-full retro-button"
              >
                <TrendingUp className="w-4 h-4 mr-2" />
                {isWalletConnected ? 'EXECUTE_TRADE' : 'CONNECT_WALLET'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};