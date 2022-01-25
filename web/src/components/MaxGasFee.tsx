import { useMaxGasFee } from 'hooks/useMaxGasFee';
import { Matic } from 'components/Matic';
import Image from 'next/image';
import React from 'react';

export default function MaxGasFee() {
  const maxGasFee = useMaxGasFee();
  return (
    <div className="flex justify-between text-gray-80">
      <p className="text-xs uppercase font-bold flex gap-2 items-center">
        <Image src="/icons/gas-pump.png" width={14} height={14} alt="" /> Max gas fee
      </p>
      <Matic value={maxGasFee} variant="currency-inline" />
    </div>
  );
}
