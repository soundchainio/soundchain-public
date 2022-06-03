import MaxGasFee from 'components/MaxGasFee';
import { SoundchainFee } from 'components/SoundchainFee';
import { WalletSelector } from 'components/WalletSelector';
import React from 'react';

interface BuyNowProps {
  price: number;
  priceOGUN: number;
  isPaymentOGUN?: boolean;
  ownerAddressAccount: string;
  startTime: number;
}

export const BuyNow = ({ price, priceOGUN, isPaymentOGUN, ownerAddressAccount, startTime }: BuyNowProps) => {
  const hasStarted = startTime <= new Date().getTime() / 1000;

  if (!hasStarted) {
    return null;
  }

  return (
    <div className="mb-16">
      <WalletSelector className="bg-gray-10 py-2" ownerAddressAccount={ownerAddressAccount} />

      <div className="flex flex-col gap-4 bg-gray-20 px-4 py-6">
        <SoundchainFee price={isPaymentOGUN ? priceOGUN : price} isPaymentOGUN={isPaymentOGUN} />
        <MaxGasFee />
      </div>
    </div>
  );
};
