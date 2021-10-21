import { useMe } from 'hooks/useMe';
import { Logo } from 'icons/Logo';
import { Matic } from 'icons/Matic';
import { MetaMask } from 'icons/MetaMask';
import { Wallet } from 'icons/Wallet';
import { DefaultWallet } from 'lib/graphql';
import Link from 'next/link';
import React from 'react';

interface BuyNFTProps {
  price: string;
  balance: string;
}

export const BuyNFT = ({ price, balance }: BuyNFTProps) => {
  const me = useMe();

  const isSounchainWallet = me?.defaultWallet === DefaultWallet.Soundchain;

  return (
    <div className="mb-2">
      <div className="flex items-center w-full py-3 px-4 mb-10 color bg-gray-20">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 text-xs text-white font-bold">
            {isSounchainWallet ? <Logo id="soundchain-wallet" height="20" width="20" /> : <MetaMask />}
            {me?.defaultWallet} Wallet
          </div>
          <div className="flex flex-col items-start md:flex-row md:items-center gap-1  font-black text-xs text-gray-80">
            <span>Balance:</span>
            <div className="flex justify-center items-center gap-1">
              <Matic />
              <p>
                <strong className="text-white">{`${balance} `}</strong>
                MATIC
              </p>
            </div>
          </div>
        </div>
        <Link href="/wallet">
          <a className="rounded border-2 border-gray-50 bg-gray-30 text-white  text-xs underline uppercase flex justify-center items-center gap-2 p-3 font-bold ml-auto">
            <Wallet />
            <span>Change wallet</span>
          </a>
        </Link>
      </div>

      <div className="flex p-5 bg-gray-20 text-gray-80">
        <p className="flex items-center flex-shrink-0 justify-start font-bold text-xs md-text-sm uppercase">
          soundchain fees (2.5%)
        </p>
        <p className="flex items-center justify-end w-full uppercase">
          <span className="my-auto">
            <Matic />
          </span>
          <span className="mx-1 text-white font-bold text-md leading-tight">{parseFloat(price) * 0.025}</span>
          <div className="items-end">
            <span className="font-bold text-xs leading-tight">matic</span>
          </div>
        </p>
      </div>
      <div className="flex p-5 bg-gray-15 text-gray-80">
        <p className="flex items-center flex-shrink-0 justify-start font-bold text-xs md-text-sm uppercase">Total</p>
        <p className="flex items-center justify-end w-full uppercase">
          <span className="my-auto">
            <Matic />
          </span>
          <span className="mx-1 text-white font-bold text-md leading-tight">{price}</span>
          <div className="items-end">
            <span className="font-bold text-xs leading-tight">matic</span>
          </div>
        </p>
      </div>
    </div>
  );
};
