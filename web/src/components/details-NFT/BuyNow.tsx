import { WalletSelector } from 'components/WalletSelector';
import { Matic } from 'icons/Matic';
import React from 'react';

interface BuyNowProps {
  price: string;
  ownerAddressAccount: string;
  startTime: number;
}

export const BuyNow = ({ price, ownerAddressAccount, startTime }: BuyNowProps) => {
  const hasStarted = startTime <= new Date().getTime() / 1000;

  return (
    <>
      {hasStarted && (
        <div className="mb-2">
          <WalletSelector ownerAddressAccount={ownerAddressAccount} />
          <div className="flex p-5 bg-gray-20 text-gray-80">
            <p className="flex items-center flex-shrink-0 justify-start font-bold text-xs md-text-sm uppercase">
              soundchain fees (2.5%)
            </p>
            <p className="flex items-center justify-end w-full uppercase">
              <span className="my-auto">
                <Matic />
              </span>
              <span className="mx-1 text-white font-bold text-md leading-tight">
                {(parseFloat(price) * 0.025).toFixed(6)}
              </span>
              <span className="items-end font-bold text-xs leading-tight">matic</span>
            </p>
          </div>
          <div className="flex p-5 bg-gray-15 text-gray-80">
            <p className="flex items-center flex-shrink-0 justify-start font-bold text-xs md-text-sm uppercase">
              Total
            </p>
            <p className="flex items-center justify-end w-full uppercase">
              <span className="my-auto">
                <Matic />
              </span>
              <span className="mx-1 text-white font-bold text-md leading-tight">{price}</span>
              <span className="items-end font-bold text-xs leading-tight">matic</span>
            </p>
          </div>
        </div>
      )}
    </>
  );
};
