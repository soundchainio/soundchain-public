import { useEffect, useState } from 'react';
import useBlockchain from './useBlockchain';
import { useWalletContext } from './useWalletContext';

export const useMaxCancelBatchListGasFee = (quantity: number, fetch = true) => {
  const { web3 } = useWalletContext();
  const { getEstimatedCancelListFee } = useBlockchain();
  const [maxGasFee, setMaxGasFee] = useState<string>();

  useEffect(() => {
    if (!fetch) return;
    const gasCheck = async () => {
      if (!web3 || !getEstimatedCancelListFee || !quantity) return;
      const maxFee = await getEstimatedCancelListFee(web3, quantity);
      setMaxGasFee(maxFee);
    };
    gasCheck();
  }, [web3, getEstimatedCancelListFee, quantity, fetch]);

  return maxGasFee;
};