import { Button } from 'components/common/Buttons/Button';
import { useModalState } from 'contexts/providers/modal';
import React from 'react';

interface BundleCardProps {
  nftIds: string[];
  tokenSymbol: string;
  tokenAmount: number;
  chainId: number;
  privateAsset?: string;
  onList: () => void;
  privateAssetOptions: string[];
  price: number;
  usdPrice: number;
  isrc: string;
  className?: string;
}

export const BundleCard = ({ nftIds, tokenSymbol, tokenAmount, chainId, privateAsset, onList, privateAssetOptions, price, usdPrice, isrc, className }: BundleCardProps) => {
  const { bundleSelections } = useModalState();
  return (
    <div className={`p-4 bg-gray-800 text-white rounded-lg shadow-md ${className}`}>
      <h3 className="text-lg font-bold">{tokenSymbol} Bundle</h3>
      <p>NFTs: {nftIds.join(', ')}</p>
      <p>Amount: {tokenAmount}</p>
      <p>Chain ID: {chainId}</p>
      <p>Private Asset: {privateAsset || 'None'}</p>
      <p>Price: ${price.toFixed(2)} ({usdPrice.toFixed(2)} USD)</p>
      <p>ISRC: {isrc || 'none'}</p>
      <Button onClick={onList} variant="outline" className="mt-2">List</Button>
    </div>
  );
};

export default BundleCard;
