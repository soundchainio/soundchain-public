import { useEffect, useState } from 'react';
import useBlockchain from './useBlockchain';
import { useWalletContext } from './useWalletContext';

export const useMaxGasFee = () => {
  const { web3 } = useWalletContext();
  const { getMaxGasFee } = useBlockchain();
  const [maxGasFee, setMaxGasFee] = useState<string>();

  useEffect(() => {
    const gasCheck = async () => {
      if (!web3 || !getMaxGasFee) return;
      const maxFee = await getMaxGasFee(web3);
      setMaxGasFee(maxFee);
    };
    gasCheck();
    const interval = setInterval(() => {
      gasCheck();
    }, 5 * 1000);
    return () => clearInterval(interval);
  }, [web3, getMaxGasFee]);

  return maxGasFee;
};
