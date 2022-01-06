import MaxGasFee from 'components/MaxGasFee';
import { SoundchainFee } from 'components/SoundchainFee';
import { WalletSelector } from 'components/WalletSelector';

import React from 'react';

interface BuyNowProps {
  price: string;
  ownerAddressAccount: string;
  startTime: number;
}

export const BuyNow = ({ price, ownerAddressAccount, startTime }: BuyNowProps) => {
  const hasStarted = startTime <= new Date().getTime() / 1000;

  if (!hasStarted) {
    return null;
  }

  return (
    <div className="mb-16">
      <WalletSelector className="bg-gray-10 py-2" ownerAddressAccount={ownerAddressAccount} />

      <div className="flex flex-col gap-4 px-4 py-6 bg-gray-20">
        <SoundchainFee price={price} />
        <MaxGasFee />
      </div>
    </div>
  );
};
