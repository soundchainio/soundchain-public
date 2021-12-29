import { useMaxGasFee } from 'hooks/useMaxGasFee';
import { Matic } from 'icons/Matic';
import { useMaticUsdQuery } from 'lib/graphql';
import Image from 'next/image';
import React from 'react';
import { currency } from 'utils/format';

export default function MaxGasFee() {
  const { data: maticUsd } = useMaticUsdQuery();
  const maxGasFee = useMaxGasFee();
  return (
    <div className="flex items-center justify-between text-xs text-gray-80">
      <div className="uppercase font-bold flex gap-2 items-center">
        <Image src="/icons/gas-pump.png" width={14} height={14} alt="" /> Max gas fee
      </div>
      <div className="flex items-center gap-1 font-bold">
        <div className="text-white text-base">{maxGasFee}</div>
        <Matic />
        <span className="text-xl text-gray-80"> ≃ </span>
        <span className="text-base text-gray-80 font-normal">
          {maticUsd && maxGasFee && `${currency(parseFloat(maxGasFee) * parseFloat(maticUsd.maticUsd))}`}
        </span>
      </div>
    </div>
  );
}
