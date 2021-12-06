import { useMaxGasFee } from 'hooks/useMaxGasFee';
import { Matic } from 'icons/Matic';
import React from 'react';

export default function MaxGasFee() {
  const maxGasFee = useMaxGasFee();
  return (
    <div className="flex-1 font-black text-xs text-gray-80">
      <p>Max gas fee</p>
      <div className="flex items-center gap-1">
        <Matic />
        <div className="text-white">{maxGasFee}</div>MATIC
      </div>
    </div>
  );
}
