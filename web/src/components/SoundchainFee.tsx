import { config } from 'config';
import { Matic } from 'icons/Matic';
import { Soundchain } from 'icons/Soundchain';

interface Props {
  price: string;
}

export const SoundchainFee = ({ price }: Props) => {
  return (
    <div className="flex text-gray-80">
      <p className="flex items-center flex-shrink-0 justify-start font-bold text-xs md-text-sm uppercase">
        <Soundchain className="mr-2" /> soundchain fee included ({config.soundchainFee * 100}%)
      </p>
      <p className="flex items-center justify-end w-full uppercase">
        <span className="my-auto">
          <Matic />
        </span>
        <span className="mx-1 text-white font-bold text-md leading-tight">
          {(parseFloat(price) * 0.025).toFixed(6)}
        </span>
        <span className="items-end font-bold text-xs leading-tight">matic</span>
      </p>
    </div>
  );
};
