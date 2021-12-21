import { useMaxGasFee } from 'hooks/useMaxGasFee';
import { Matic } from 'icons/Matic';
import React from 'react';
import Image from 'next/image';

export default function MaxGasFee() {
  const maxGasFee = useMaxGasFee();
  return (
    <div className="flex items-center justify-between text-xs text-gray-80">
      <div className="uppercase font-bold flex gap-2 items-center">
        <Image src="/icons/gas-pump.png" width={14} height={14} alt="" /> Max gas fee
      </div>
      <div className="flex items-center gap-1 font-bold">
        <Matic />
        <div className="text-white text-base">{maxGasFee}</div>MATIC
      </div>
    </div>
  );
}
