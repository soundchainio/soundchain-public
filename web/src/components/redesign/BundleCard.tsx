import React, { useState } from 'react';
import { Card, CardContent, CardHeader } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Package, RotateCcw, ShoppingBag, Gift, Maximize2, Database, Expand } from 'lucide-react';

interface BundleCardProps {
  bundle: {
    id: string;
    nftIds: string[];
    tokenSymbol: string;
    tokenAmount: number;
    chainId: number;
    privateAsset?: string;
    price: {
      value: number;
      currency: string;
    };
    usdPrice: number;
    ISRC: string;
  };
  privateAssetOptions: string[];
  onPurchase: (bundleId: string) => void;
  listView?: boolean;  
  onShowDetails?: (bundle: any, type: 'nft' | 'token' | 'bundle') => void;
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

export const BundleCard: React.FC<BundleCardProps> = ({ 
  bundle, 
  privateAssetOptions,
  onPurchase,
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

  const getAssetIcon = () => {
    switch (bundle.privateAsset) {
      case 'concert tickets':
        return '🎵';
      case 'movie tickets':
        return '🎬';
      case 'sporting event tickets':
        return '🏆';
      case 'vinyl':
        return '🎵';
      case 'homes':
        return '🏠';
      case 'cars':
        return '🚗';
      case 'clothing':
        return '👕';
      default:
        return '📦';
    }
  };

  const getAssetUtilities = (assetType: string) => {
    switch (assetType) {
      case 'concert tickets':
        return ['VIP Access', 'Meet & Greet', 'Exclusive Merch', 'Front Row Seats'];
      case 'movie tickets':
        return ['Premium Screening', 'Director Commentary', 'Behind Scenes', 'Collectible Poster'];
      case 'sporting event tickets':
        return ['Field Access', 'Player Meet', 'Official Jersey', 'Season Pass'];
      case 'vinyl':
        return ['Limited Edition', 'Signed Copy', 'Special Packaging', 'Digital Download'];
      case 'homes':
        return ['Property Rights', 'Rental Income', 'Voting Rights', 'Maintenance Access'];
      case 'cars':
        return ['Ownership Title', 'Insurance Included', 'Maintenance Package', 'Resale Rights'];
      case 'clothing':
        return ['Authenticity Cert', 'Size Exchange', 'Care Instructions', 'Designer Access'];
      default:
        return ['Exclusive Access', 'Utility Rights', 'Special Benefits', 'Member Perks'];
    }
  };

  const mockBundleData = {
    bundleType: 'Premium Collection',
    totalValue: bundle.usdPrice * 1.2,
    savings: bundle.usdPrice * 0.2,
    exclusivityLevel: 'Limited Edition',
    transferRights: true,
    unlockableContent: true,
    expiration: '2025-12-31',
    membershipLevel: 'Gold',
    nftPreviews: bundle.nftIds.map(id => ({
      id,
      name: `NFT #${id}`,
      rarity: ['common', 'rare', 'epic', 'legendary'][Math.floor(Math.random() * 4)]
    }))
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
      // Generate a bundle icon image for full-screen viewing
      const canvas = document.createElement('canvas');
      canvas.width = 400;
      canvas.height = 400;
      const ctx = canvas.getContext('2d');
      
      if (ctx) {
        // Create gradient background
        const gradient = ctx.createLinearGradient(0, 0, 400, 400);
        gradient.addColorStop(0, '#8b5cf6');
        gradient.addColorStop(1, '#ec4899');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 400, 400);
        
        // Add bundle icon
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 80px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('📦', 200, 200);
        
        // Add asset emoji
        ctx.font = 'bold 60px Arial';
        ctx.fillText(getAssetIcon(), 200, 280);
        
        // Convert to data URL
        const dataURL = canvas.toDataURL();
        
        onImageClick(
          dataURL,
          `Bundle #${bundle.id}`,
          `Bundle #${bundle.id} - ${bundle.privateAsset}`,
          {
            bundleId: bundle.id,
            privateAsset: bundle.privateAsset,
            nftCount: bundle.nftIds.length,
            chain: chainNames[bundle.chainId] || `Chain ${bundle.chainId}`
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
                className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center text-2xl analog-glow relative group cursor-pointer"
                onClick={handleImageClick}
              >
                {getAssetIcon()}
                {onImageClick && (
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-lg flex items-center justify-center">
                    <Expand className="w-4 h-4 text-soundchain-accent" />
                  </div>
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-1">
                  <h3 className="retro-text text-white">Bundle #{bundle.id}</h3>
                  <Badge className="text-xs bg-purple-500/20 text-purple-400 border-purple-500/30">
                    <Package className="w-3 h-3 mr-1" />
                    Bundle
                  </Badge>
                </div>
                <div className="text-sm text-gray-400">
                  {bundle.nftIds.length} NFTs • {bundle.privateAsset} • {chainNames[bundle.chainId] || `Chain ${bundle.chainId}`}
                </div>
                <div className="retro-json text-xs">
                  ISRC: {bundle.ISRC}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="retro-text text-white">
                {formatNumber(bundle.price.value)} {bundle.price.currency}
              </div>
              <div className="text-sm text-gray-400">
                ≈ ${formatNumber(bundle.usdPrice)}
              </div>
            </div>
            <div className="flex flex-col space-y-2">
              <Button
                onClick={() => onPurchase(bundle.id)}
                size="sm"
                className="retro-button"
              >
                Buy Bundle
              </Button>
              <div className="flex space-x-1">
                {onImageClick && (
                  <Button
                    onClick={handleImageClick}
                    size="sm"
                    variant="outline"
                    className="soundchain-button-outline flex-1"
                    title="View full-screen bundle icon"
                  >
                    <Expand className="w-4 h-4" />
                  </Button>
                )}
                {onShowDetails && (
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      onShowDetails(bundle, 'bundle');
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
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center text-xl analog-glow">
                    {getAssetIcon()}
                  </div>
                  <div>
                    <h3 className="retro-title text-sm">Bundle #{bundle.id}</h3>
                    <p className="retro-json text-xs">{chainNames[bundle.chainId] || `Chain ${bundle.chainId}`}</p>
                  </div>
                </div>
                <Badge className="text-xs bg-purple-500/20 text-purple-400 border-purple-500/30">
                  <Package className="w-3 h-3 mr-1" />
                  Bundle
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
                      <span key={nftId} className="metadata-attribute">
                        {nftId}
                      </span>
                    ))}
                    {bundle.nftIds.length > 3 && (
                      <span className="metadata-attribute">
                        +{bundle.nftIds.length - 3} more
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="metadata-section">
                  <div className="metadata-label">Bundle Price</div>
                  <div className="metadata-value">
                    {formatNumber(bundle.price.value)} {bundle.price.currency}
                  </div>
                  <div className="text-sm text-gray-400">
                    ≈ ${formatNumber(bundle.usdPrice)} USD
                  </div>
                </div>

                <div className="metadata-section">
                  <div className="metadata-label">Token Amount</div>
                  <div className="metadata-value">
                    {formatNumber(bundle.tokenAmount)} {bundle.tokenSymbol}
                  </div>
                </div>

                <div className="metadata-section">
                  <div className="metadata-label">ISRC</div>
                  <div className="retro-json text-xs">
                    {bundle.ISRC}
                  </div>
                </div>

                <div className="space-y-2">
                  <Button
                    onClick={(e) => handleButtonClick(e, () => onPurchase(bundle.id))}
                    className="w-full retro-button"
                  >
                    <Package className="w-4 h-4 mr-2" />
                    Buy Bundle
                  </Button>
                  {onShowDetails && (
                    <Button
                      onClick={(e) => handleButtonClick(e, () => onShowDetails(bundle, 'bundle'))}
                      className="w-full soundchain-button-outline"
                      variant="outline"
                      size="sm"
                    >
                      <Database className="w-4 h-4 mr-2" />
                      Web3 Details
                    </Button>
                  )}
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
              BUNDLE_MANIFEST.JSON
            </div>

            <div className="flex-1 overflow-y-auto space-y-3">
              {/* Bundle Overview */}
              <div className="metadata-section">
                <div className="metadata-label">BUNDLE_OVERVIEW</div>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400">TYPE:</span>
                    <span className="metadata-value text-xs">{mockBundleData.bundleType}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400">TIER:</span>
                    <span className="metadata-value">{mockBundleData.membershipLevel}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400">EXCLUSIVITY:</span>
                    <span className="metadata-value text-xs">{mockBundleData.exclusivityLevel}</span>
                  </div>
                </div>
              </div>

              {/* Value Analysis */}
              <div className="metadata-section">
                <div className="metadata-label">VALUE_ANALYSIS</div>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400">TOTAL VALUE:</span>
                    <span className="metadata-value">${formatNumber(mockBundleData.totalValue)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400">BUNDLE PRICE:</span>
                    <span className="metadata-value">${formatNumber(bundle.usdPrice)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400">SAVINGS:</span>
                    <span className="metadata-value text-green-400">${formatNumber(mockBundleData.savings)}</span>
                  </div>
                </div>
              </div>

              {/* NFT Contents */}
              <div className="metadata-section">
                <div className="metadata-label">NFT_COLLECTION</div>
                <div className="space-y-1">
                  {mockBundleData.nftPreviews.map((nft, index) => (
                    <div key={index} className="flex justify-between text-xs">
                      <span className="text-gray-400">{nft.name}:</span>
                      <span className={`metadata-value text-xs ${
                        nft.rarity === 'legendary' ? 'text-yellow-400' :
                        nft.rarity === 'epic' ? 'text-purple-400' :
                        nft.rarity === 'rare' ? 'text-blue-400' : 'text-gray-300'
                      }`}>
                        {nft.rarity.toUpperCase()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Private Asset Details */}
              <div className="metadata-section">
                <div className="metadata-label">PRIVATE_ASSET_UTILITIES</div>
                <div className="space-y-2">
                  <div className="text-xs text-gray-300 mb-2 capitalize">
                    {bundle.privateAsset} Package Includes:
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {getAssetUtilities(bundle.privateAsset || '').map((utility, index) => (
                      <span key={index} className="metadata-attribute text-xs">
                        {utility}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Token Allocation */}
              <div className="metadata-section">
                <div className="metadata-label">TOKEN_ALLOCATION</div>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400">SYMBOL:</span>
                    <span className="metadata-value">{bundle.tokenSymbol}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400">AMOUNT:</span>
                    <span className="metadata-value">{formatNumber(bundle.tokenAmount)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400">BLOCKCHAIN:</span>
                    <span className="metadata-value">{chainNames[bundle.chainId]}</span>
                  </div>
                </div>
              </div>

              {/* Rights & Access */}
              <div className="metadata-section">
                <div className="metadata-label">RIGHTS_&_ACCESS</div>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400">TRANSFERABLE:</span>
                    <span className="metadata-value text-green-400">
                      {mockBundleData.transferRights ? 'YES' : 'NO'}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400">UNLOCKABLE:</span>
                    <span className="metadata-value text-green-400">
                      {mockBundleData.unlockableContent ? 'YES' : 'NO'}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400">EXPIRES:</span>
                    <span className="metadata-value">{mockBundleData.expiration}</span>
                  </div>
                </div>
              </div>

              {/* JSON Metadata */}
              <div className="metadata-section">
                <div className="metadata-label">RAW_MANIFEST</div>
                <div className="metadata-json text-xs leading-tight">
{`{
  "bundle_id": "${bundle.id}",
  "type": "multi_asset_bundle",
  "private_asset": "${bundle.privateAsset}",
  "nft_collection": [${bundle.nftIds.map(id => `"${id}"`).join(', ')}],
  "token_allocation": {
    "symbol": "${bundle.tokenSymbol}",
    "amount": ${bundle.tokenAmount},
    "chain_id": ${bundle.chainId}
  },
  "bundle_metadata": {
    "exclusivity": "${mockBundleData.exclusivityLevel}",
    "transferable": ${mockBundleData.transferRights},
    "unlockable_content": ${mockBundleData.unlockableContent},
    "membership_tier": "${mockBundleData.membershipLevel}",
    "expiration": "${mockBundleData.expiration}"
  },
  "isrc": "${bundle.ISRC}",
  "total_value_usd": ${mockBundleData.totalValue},
  "bundle_discount": ${mockBundleData.savings}
}`}
                </div>
              </div>
            </div>

            {/* Purchase Button */}
            <div className="mt-4">
              <Button
                onClick={(e) => handleButtonClick(e, () => onPurchase(bundle.id))}
                className="w-full retro-button"
              >
                <ShoppingBag className="w-4 h-4 mr-2" />
                ACQUIRE_BUNDLE
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};