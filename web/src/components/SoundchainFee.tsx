import { Matic } from 'components/Matic';
import { Ogun } from 'components/Ogun';
import { config } from 'config';
import { Logo as OgunIcon } from 'icons/Logo';
import { Soundchain } from 'icons/Soundchain';
import { useState } from 'react';
import { fixedDecimals } from 'utils/format';

interface Props {
  price: number;
  isPaymentOGUN?: boolean;
  rewardRatePercentage?: string;
}

export const SoundchainFee = ({ price, isPaymentOGUN, rewardRatePercentage }: Props) => {
  const [showOgunTip, setShowOgunTip] = useState(false);
  let ogunBonus = null;
  if (isPaymentOGUN && rewardRatePercentage) {
    ogunBonus = Math.min(fixedDecimals(price * (parseFloat(rewardRatePercentage) / 100)), 1000);
  }

  return (
    <>
      {isPaymentOGUN === undefined ? (
        <>
          <div className="flex text-gray-80">
            <p className="md-text-sm flex flex-shrink-0 items-center justify-start text-xs font-bold uppercase">
              <Soundchain className="mr-2" /> MATIC SoundChain fee ({config.soundchainFee * 100}%)
            </p>
            <div className="flex w-full justify-end">
              <Matic value={fixedDecimals(price * config.soundchainFee)} variant="currency-inline" />
            </div>
          </div>
          <div className="flex text-gray-80">
            <p className="md-text-sm flex flex-shrink-0 items-center justify-start text-xs font-bold uppercase">
              <Soundchain className="mr-2" /> OGUN SoundChain fee ({config.soundchainFee * 100}%)
            </p>
            <div className="flex w-full justify-end">
              <Ogun
                value={fixedDecimals(price * config.soundchainFee)}
                variant="currency-inline"
                rewardRatePercentage={rewardRatePercentage}
              />
            </div>
          </div>
        </>
      ) : (
        <>
          {isPaymentOGUN ? (
            <>
              {ogunBonus && (
                <div className="mb-1 flex text-gray-80">
                  <p className="md-text-sm flex flex-shrink-0 items-center justify-start text-xs font-bold uppercase">
                    <Soundchain className="mr-2" /> OGUN Bonus ({rewardRatePercentage}%)
                  </p>
                  <div
                    className="flex w-full justify-end"
                    onMouseEnter={() => setShowOgunTip(true)}
                    onMouseLeave={() => setShowOgunTip(false)}
                  >
                    <div className={'mr-1 inline-flex items-center gap-1 font-bold text-white'}>
                      <p className="buy-now-gradient text-sm">+{ogunBonus} OGUN BONUS</p>
                    </div>
                    <OgunIcon id="ogun-token" className="inline h-5 w-5" />
                    <div
                      className={
                        'absolute ml-[-40px] mt-5 w-32 rounded-md bg-gray-30 p-2 opacity-90' +
                        (showOgunTip ? ' visible' : ' invisible')
                      }
                    >
                      <p className="m-2 text-xxs text-white opacity-100">
                        When you buy with OGUN, you get a {rewardRatePercentage}% bonus per NFT, up to 1000
                      </p>
                    </div>
                  </div>
                </div>
              )}
              <div className="flex text-gray-80">
                <p className="md-text-sm flex flex-shrink-0 items-center justify-start text-xs font-bold uppercase">
                  <Soundchain className="mr-2" /> OGUN SoundChain fee ({config.soundchainFee * 100}%)
                </p>
                <div className="flex w-full justify-end">
                  <Ogun
                    value={fixedDecimals(price * config.soundchainFee)}
                    variant="currency-inline"
                    rewardRatePercentage={rewardRatePercentage}
                  />
                </div>
              </div>
            </>
          ) : (
            <div className="flex text-gray-80">
              <p className="md-text-sm flex flex-shrink-0 items-center justify-start text-xs font-bold uppercase">
                <Soundchain className="mr-2" /> MATIC SoundChain fee ({config.soundchainFee * 100}%)
              </p>
              <div className="flex w-full justify-end">
                <Matic value={fixedDecimals(price * config.soundchainFee)} variant="currency-inline" />
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
};
