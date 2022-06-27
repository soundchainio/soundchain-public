import { useMaxGasFee } from 'hooks/useMaxGasFee';
import { Matic } from 'components/Matic';
import Image from 'next/image';
import React from 'react';

export default function MaxGasFee({ text = 'Max gas fee' }: { text?: string }) {
  const maxGasFee = useMaxGasFee();
  return (
    <div className="flex justify-between text-gray-80">
      <p className="flex items-center gap-2 text-xs font-bold uppercase">
        <Image src="/icons/gas-pump.png" width={14} height={14} alt="" /> Max gas fee
        <Image src="/icons/gas-pump.png" width={14} height={14} alt="" /> {text}
      </p>
      <Matic value={maxGasFee} variant="currency-inline" />
    </div>
  );
}
