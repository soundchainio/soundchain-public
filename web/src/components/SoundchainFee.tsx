import { config } from 'config';
import { Matic } from 'components/Matic';
import { Soundchain } from 'icons/Soundchain';
import { fixedDecimals } from 'utils/format';

interface Props {
  price: number;
}

export const SoundchainFee = ({ price }: Props) => {
  return (
    <div className="flex text-gray-80">
      <p className="flex items-center flex-shrink-0 justify-start font-bold text-xs md-text-sm uppercase">
        <Soundchain className="mr-2" /> SoundChain fee ({config.soundchainFee * 100}%)
      </p>
      <div className="flex justify-end w-full">
        <Matic value={fixedDecimals(price * config.soundchainFee)} variant="currency-inline" />
      </div>
    </div>
  );
};
