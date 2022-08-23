import MaxGasFee from 'components/MaxGasFee';
import { SoundchainFee } from 'components/SoundchainFee';
import { WalletSelector } from 'components/WalletSelector';
import useBlockchainV2 from 'hooks/useBlockchainV2';
import { useWalletContext } from 'hooks/useWalletContext';
import { useEffect, useState } from 'react';
import Web3 from 'web3';

interface BuyNowProps {
  price: number;
  priceOGUN: number;
  isPaymentOGUN: boolean;
  ownerAddressAccount: string;
  startTime: number;
}

export const BuyNow = ({ price, priceOGUN, isPaymentOGUN, ownerAddressAccount, startTime }: BuyNowProps) => {
  const hasStarted = startTime <= new Date().getTime() / 1000;

  const { web3 } = useWalletContext();
  const { getRewardsRate } = useBlockchainV2();
  const [rewardRatePercentage, setRewardsRatePercentage] = useState('');

  useEffect(() => {
    const fetchRewardRate = async () => {
      const result1e4 = await getRewardsRate(web3 as Web3);
      const calculatedPercentage = (parseInt(result1e4) / 10000) * 100;
      setRewardsRatePercentage(calculatedPercentage.toString());
    };
    fetchRewardRate();
  }, [setRewardsRatePercentage, getRewardsRate, web3]);

  if (!hasStarted) {
    return null;
  }

  return (
    <div className="mb-16">
      <WalletSelector className="bg-gray-10 py-2" ownerAddressAccount={ownerAddressAccount} />

      <div className="flex flex-col gap-4 bg-gray-20 px-4 py-6">
        <SoundchainFee
          price={isPaymentOGUN ? priceOGUN : price}
          isPaymentOGUN={isPaymentOGUN}
          rewardRatePercentage={rewardRatePercentage}
          showSoundChainFee={false}
        />
        <MaxGasFee />
      </div>
    </div>
  );
};
