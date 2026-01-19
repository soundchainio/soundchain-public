import React, { useState } from 'react';
import { Card, CardContent, CardHeader } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Heart, RotateCcw, ShoppingCart, Palette, Star, Eye, Database, Maximize2, Expand } from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { toast } from 'react-toastify';

interface NFTCardProps {
  nft: {
    id: string;
    name: string;
    collection: string;
    tokenId: string;
    chainId: number;
    price: {
      value: number;
      currency: string;
    };
    usdPrice: number;
    image: string;
    rarity: 'common' | 'rare' | 'epic' | 'legendary';
    attributes: { trait_type: string; value: string | number }[];
    creator: string;
    owner: string;
  };
  onPurchase: (nftId: string) => void;
  isWalletConnected: boolean;
  listView?: boolean;
  onShowDetails?: (nft: any, type: 'nft' | 'token' | 'bundle') => void;
  onImageClick?: (src: string, alt: string, title?: string, metadata?: any) => void;
  onFavorite?: (nftId: string) => void;
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

export const NFTCard: React.FC<NFTCardProps> = ({
  nft,
  onPurchase,
  isWalletConnected,
  listView = false,
  onShowDetails,
  onImageClick,
  onFavorite
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

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'legendary':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'epic':
        return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      case 'rare':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const shortenAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const getRarityScore = (rarity: string) => {
    switch (rarity) {
      case 'legendary': return 95;
      case 'epic': return 78;
      case 'rare': return 45;
      default: return 15;
    }
  };

  const mockMetadata = {
    contractAddress: '0x' + nft.id.padStart(40, '0'),
    tokenStandard: 'ERC-721',
    mintDate: '2024-02-20',
    lastSale: nft.usdPrice * 0.8,
    royaltyPercentage: 5.0,
    totalSupply: 10000,
    ranking: Math.floor(Math.random() * 1000) + 1,
    utilityAccess: ['Exclusive Events', 'DAO Voting', 'Merch Discounts'],
    ipfsHash: 'QmY7Yh4UquoXHLPFo2XbhXkhBvFoPwmQUSa92pxnxjQuPU'
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
      onImageClick(
        nft.image, 
        nft.name, 
        nft.name,
        {
          artist: shortenAddress(nft.creator),
          collection: nft.collection,
          tokenId: nft.tokenId,
          chain: chainNames[nft.chainId] || `Chain ${nft.chainId}`
        }
      );
    }
  };

  if (listView) {
    return (
      <Card className="retro-card transition-all duration-200">
        <CardContent className="p-4">
          <div className="flex items-center justify-between space-x-4">
            <div className="flex items-center space-x-4 flex-1">
              <div className="w-16 h-16 bg-gray-700 rounded-lg overflow-hidden flex-shrink-0 analog-glow relative group cursor-pointer" onClick={handleImageClick}>
                <ImageWithFallback
                  src={nft.image}
                  alt={nft.name}
                  className="card-image h-16 transition-transform duration-300 group-hover:scale-105"
                />
                {onImageClick && (
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                    <Expand className="w-4 h-4 text-soundchain-accent" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 mb-1">
                  <h3 className="retro-text text-white truncate">{nft.name}</h3>
                  <Badge className={`text-xs ${getRarityColor(nft.rarity)}`}>
                    {nft.rarity}
                  </Badge>
                </div>
                <div className="text-sm text-gray-400 truncate">{nft.collection}</div>
                <div className="retro-json text-xs">
                  Token ID: {nft.tokenId} • {chainNames[nft.chainId] || `Chain ${nft.chainId}`}
                </div>
                <div className="text-xs text-gray-500">
                  Owner: {shortenAddress(nft.owner)}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="retro-text text-white">
                {formatNumber(nft.price.value)} {nft.price.currency}
              </div>
              <div className="text-sm text-gray-400">
                ≈ ${formatNumber(nft.usdPrice)}
              </div>
            </div>
            <div className="flex flex-col space-y-2">
              <Button
                onClick={() => onPurchase(nft.id)}
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
                    title="View full-screen artwork"
                  >
                    <Expand className="w-4 h-4" />
                  </Button>
                )}
                {onShowDetails && (
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      onShowDetails(nft, 'nft');
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
    <div className="nft-flip-card-container" onClick={handleCardClick}>
      <div className={`nft-flip-card ${isFlipped ? 'flipped' : ''}`}>
        {/* Front Side */}
        <div className="nft-flip-card-front">
          <Card className="retro-card transition-all duration-200 hover:scale-105 h-full">
            <div className="flip-hint">
              <RotateCcw className="w-3 h-3" />
            </div>
            <CardHeader className="pb-2">
              <div className="aspect-square bg-gray-700 rounded-lg overflow-hidden mb-3 analog-glow relative group cursor-pointer" onClick={handleImageClick}>
                <ImageWithFallback
                  src={nft.image}
                  alt={nft.name}
                  className="card-image transition-transform duration-300 group-hover:scale-105"
                />
                {onImageClick && (
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                    <div className="bg-soundchain-accent/20 border border-soundchain-accent/50 rounded-full p-2">
                      <Expand className="w-6 h-6 text-soundchain-accent" />
                    </div>
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <h3 className="retro-title text-sm truncate">{nft.name}</h3>
                  <p className="retro-json text-xs truncate">{nft.collection}</p>
                </div>
                <Badge className={`text-xs ${getRarityColor(nft.rarity)} ml-2`}>
                  {nft.rarity}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-3">
                <div className="metadata-section">
                  <div className="metadata-label">Price</div>
                  <div className="metadata-value">
                    {formatNumber(nft.price.value)} {nft.price.currency}
                  </div>
                  <div className="text-sm text-gray-400">
                    ≈ ${formatNumber(nft.usdPrice)} USD
                  </div>
                </div>

                <div className="metadata-section">
                  <div className="metadata-label">Details</div>
                  <div className="text-xs text-gray-300 space-y-1">
                    <div>Token ID: {nft.tokenId}</div>
                    <div>Chain: {chainNames[nft.chainId] || `Chain ${nft.chainId}`}</div>
                    <div>Owner: {shortenAddress(nft.owner)}</div>
                  </div>
                </div>

                <div className="metadata-section">
                  <div className="metadata-label">Top Traits</div>
                  <div className="flex flex-wrap gap-1">
                    {nft.attributes.slice(0, 2).map((attr, index) => (
                      <span key={index} className="metadata-attribute">
                        {attr.trait_type}: {attr.value}
                      </span>
                    ))}
                    {nft.attributes.length > 2 && (
                      <span className="metadata-attribute">
                        +{nft.attributes.length - 2}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex space-x-2">
                  <Button
                    onClick={(e) => handleButtonClick(e, () => onPurchase(nft.id))}
                    disabled={!isWalletConnected}
                    className="flex-1 retro-button"
                  >
                    {isWalletConnected ? 'Buy Now' : 'Connect Wallet'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-gray-600 text-gray-300 hover:bg-gray-700"
                    onClick={(e) => handleButtonClick(e, () => {
                      if (onFavorite) {
                        onFavorite(nft.id)
                      } else {
                        toast.info('💜 NFT watchlist coming soon!')
                      }
                    })}
                  >
                    <Heart className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Back Side - TrackMetadataForm Style */}
        <div className="nft-flip-card-back">
          <div className="p-4 h-full flex flex-col text-white">
            <div className="flip-hint">
              <RotateCcw className="w-3 h-3" />
            </div>
            
            <div className="retro-title text-center mb-4 text-sm">
              NFT_METADATA.JSON
            </div>

            <div className="flex-1 overflow-y-auto space-y-3">
              {/* Collection Info */}
              <div className="metadata-section">
                <div className="metadata-label">COLLECTION_INFO</div>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400">NAME:</span>
                    <span className="metadata-value text-xs">{nft.collection}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400">TOKEN_ID:</span>
                    <span className="metadata-value">{nft.tokenId}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400">STANDARD:</span>
                    <span className="metadata-value">{mockMetadata.tokenStandard}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400">SUPPLY:</span>
                    <span className="metadata-value">{formatNumber(mockMetadata.totalSupply)}</span>
                  </div>
                </div>
              </div>

              {/* Rarity & Ranking */}
              <div className="metadata-section">
                <div className="metadata-label">RARITY_ANALYSIS</div>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400">TIER:</span>
                    <span className="metadata-value uppercase">{nft.rarity}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400">RANK:</span>
                    <span className="metadata-value">#{mockMetadata.ranking}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400">SCORE:</span>
                    <span className="metadata-value">{getRarityScore(nft.rarity)}/100</span>
                  </div>
                </div>
              </div>

              {/* All Attributes */}
              <div className="metadata-section">
                <div className="metadata-label">ALL_ATTRIBUTES</div>
                <div className="space-y-1">
                  {nft.attributes.map((attr, index) => (
                    <div key={index} className="flex justify-between text-xs">
                      <span className="text-gray-400">{attr.trait_type.toUpperCase()}:</span>
                      <span className="metadata-value text-xs">{attr.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Ownership */}
              <div className="metadata-section">
                <div className="metadata-label">OWNERSHIP_DATA</div>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400">CREATOR:</span>
                    <span className="metadata-value text-xs">{shortenAddress(nft.creator)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400">OWNER:</span>
                    <span className="metadata-value text-xs">{shortenAddress(nft.owner)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400">ROYALTY:</span>
                    <span className="metadata-value">{mockMetadata.royaltyPercentage}%</span>
                  </div>
                </div>
              </div>

              {/* Utility Access */}
              <div className="metadata-section">
                <div className="metadata-label">UTILITY_ACCESS</div>
                <div className="flex flex-wrap gap-1">
                  {mockMetadata.utilityAccess.map((utility, index) => (
                    <span key={index} className="metadata-attribute">
                      {utility}
                    </span>
                  ))}
                </div>
              </div>

              {/* IPFS & Blockchain Links */}
              <div className="metadata-section">
                <div className="metadata-label">BLOCKCHAIN_LINKS</div>
                <div className="space-y-2">
                  <a
                    href={`https://soundchain.mypinata.cloud/ipfs/${mockMetadata.ipfsHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center justify-between text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
                  >
                    <span className="text-gray-400">IPFS:</span>
                    <span className="flex items-center gap-1">
                      <Database className="w-3 h-3" />
                      {mockMetadata.ipfsHash.substring(0, 12)}...
                    </span>
                  </a>
                  <a
                    href={`https://polygonscan.com/token/${mockMetadata.contractAddress}?a=${nft.tokenId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center justify-between text-xs text-purple-400 hover:text-purple-300 transition-colors"
                  >
                    <span className="text-gray-400">LEDGER:</span>
                    <span className="flex items-center gap-1">
                      <Eye className="w-3 h-3" />
                      PolygonScan
                    </span>
                  </a>
                </div>
              </div>

              {/* JSON Metadata */}
              <div className="metadata-section">
                <div className="metadata-label">RAW_METADATA</div>
                <div className="metadata-json text-xs leading-tight">
{`{
  "name": "${nft.name}",
  "description": "Digital collectible from ${nft.collection}",
  "image": "ipfs://${mockMetadata.ipfsHash}",
  "attributes": [${nft.attributes.map(attr => `
    {
      "trait_type": "${attr.trait_type}",
      "value": "${attr.value}"
    }`).join(',')}
  ],
  "token_id": "${nft.tokenId}",
  "contract": "${mockMetadata.contractAddress}",
  "standard": "${mockMetadata.tokenStandard}",
  "chain_id": ${nft.chainId},
  "rarity_rank": ${mockMetadata.ranking},
  "rarity_score": ${getRarityScore(nft.rarity)}
}`}
                </div>
              </div>
            </div>

            {/* Purchase Button */}
            <div className="mt-4">
              <Button
                onClick={(e) => handleButtonClick(e, () => onPurchase(nft.id))}
                disabled={!isWalletConnected}
                className="w-full retro-button"
              >
                <ShoppingCart className="w-4 h-4 mr-2" />
                {isWalletConnected ? 'ACQUIRE_NFT' : 'CONNECT_WALLET'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};