import { Matic } from 'components/Matic';
import { Ogun } from 'components/Ogun';
import { config } from 'config';
import { Soundchain } from 'icons/Soundchain';
import { fixedDecimals } from 'utils/format';

interface Props {
  price: number;
  isPaymentOGUN?: boolean;
}

export const SoundchainFee = ({ price, isPaymentOGUN }: Props) => {
  return (
    <>
    {isPaymentOGUN === undefined ? (
      <>
        <div className="flex text-gray-80">
          <p className="flex items-center flex-shrink-0 justify-start font-bold text-xs md-text-sm uppercase">
            <Soundchain className="mr-2" /> MATIC SoundChain fee ({config.soundchainFee * 100}%)
          </p>
          <div className="flex justify-end w-full">
            <Matic value={fixedDecimals(price * config.soundchainFee)} variant="currency-inline" />
          </div>
        </div>
        <div className="flex text-gray-80">
          <p className="flex items-center flex-shrink-0 justify-start font-bold text-xs md-text-sm uppercase">
            <Soundchain className="mr-2" /> OGUN SoundChain fee ({config.soundchainFee * 100}%)
          </p>
          <div className="flex justify-end w-full">
            <Ogun value={fixedDecimals(price * config.soundchainFee)} variant="currency-inline" />
          </div>
        </div>
      </>
    ):(
      <>
        {isPaymentOGUN ? (
        <div className="flex text-gray-80">
          <p className="flex items-center flex-shrink-0 justify-start font-bold text-xs md-text-sm uppercase">
            <Soundchain className="mr-2" /> OGUN SoundChain fee ({config.soundchainFee * 100}%)
          </p>
          <div className="flex justify-end w-full">
            <Ogun value={fixedDecimals(price * config.soundchainFee)} variant="currency-inline" />
          </div>
        </div>
        ):(
        <div className="flex text-gray-80">
          <p className="flex items-center flex-shrink-0 justify-start font-bold text-xs md-text-sm uppercase">
            <Soundchain className="mr-2" /> MATIC SoundChain fee ({config.soundchainFee * 100}%)
          </p>
          <div className="flex justify-end w-full">
            <Matic value={fixedDecimals(price * config.soundchainFee)} variant="currency-inline" />
          </div>
        </div>
        )}
      </>
    )}

    </>
  );
};
