import { Logo } from 'icons/Logo';
import { Matic } from 'icons/Matic';
import React from 'react';

interface BuyNFTProps {
  price: number;
  balance: string;
}

export const BuyNFT = ({ price, balance }: BuyNFTProps) => {
  return (
    <div className="mb-2">
      <div className="flex">
        <div className="flex items-center w-full py-3 px-4 mb-10" style={{ backgroundColor: '#202020' }}>
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 text-xs text-white font-bold">
              <Logo id="soundchain-wallet" height="20" width="20" /> SoundChain Wallet
            </div>
            <div className="flex items-center gap-2 font-black text-xs" style={{ color: '#808080' }}>
              Balance: <Matic />
              <div className="text-white">{balance}</div>MATIC
            </div>
          </div>
        </div>
      </div>

      <div className="flex">
        <div className="flex items-center w-10/12 justify-start bg-gray-20 text-gray-80 font-bold text-xs md-text-sm uppercase py-5 pl-5">
          soundchain fees (2.5%)
        </div>
        <div className="flex flex-wrap items-center justify-end w-full bg-gray-20 uppercase py-5 pr-5">
          <span className="my-auto">
            <Matic />
          </span>
          <span className="mx-1 text-gray-80 font-bold text-md leading-tight">{price * 0.025}</span>
          <div className="items-end">
            <span className="text-gray-80 font-bold text-xs leading-tight">matic</span>
          </div>
        </div>
      </div>
      <div className="flex">
        <div className="flex items-center justify-start bg-gray-15 text-gray-80 font-bold text-xs md-text-sm uppercase py-5 pl-5">
          total
        </div>
        <div className="flex flex-wrap items-center justify-end w-full bg-gray-15 uppercase py-5 pr-5">
          <span className="my-auto">
            <Matic />
          </span>
          <span className="mx-1 text-gray-80 font-bold text-md leading-tight">{price}</span>
          <div className="items-end">
            <span className="text-gray-80 font-bold text-xs leading-tight">matic</span>
          </div>
        </div>
      </div>
    </div>
  );
};
