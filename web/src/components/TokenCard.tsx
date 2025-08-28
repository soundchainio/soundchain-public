import { Button } from 'components/common/Buttons/Button';
import React from 'react';

interface TokenCardProps {
  tokenSymbol: string;
  tokenAmount: number;
  chainId: number;
  price: number;
  usdPrice: number;
  isrc: string;
  className?: string;
  onBuy?: () => void; // Add buy handler
}

export const TokenCard = ({ tokenSymbol, tokenAmount, chainId, price, usdPrice, isrc, className, onBuy }: TokenCardProps) => {
  return (
    <div className={`p-4 bg-gray-800 text-white rounded-lg shadow-md ${className}`}>
      <h3 className="text-lg font-bold">{tokenSymbol}</h3>
      <p>Amount: {tokenAmount}</p>
      <p>Chain ID: {chainId}</p>
      <p>Price: ${price.toFixed(2)} ({usdPrice.toFixed(2)} USD)</p>
      <p>ISRC: {isrc || 'none'}</p>
      <Button variant="outline" onClick={onBuy}>Buy</Button>
    </div>
  );
};

export default TokenCard;
