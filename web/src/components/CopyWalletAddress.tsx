import { Copy2 as Copy } from 'icons/Copy2';
import { Polygon } from 'icons/Polygon';
import { toast } from 'react-toastify';

interface CopyWalletAddressProps {
  walletAddress: string;
}

export const CopyWalletAddress = ({ walletAddress }: CopyWalletAddressProps) => {
  return (
    <div className="flex flex-row text-xxs bg-gray-1A w-full pl-2 pr-3 py-2 items-center justify-between border border-gray-50 rounded-sm">
      <div className="flex flex-row items-center w-10/12 justify-start">
        <Polygon />
        <span className="text-gray-80 md-text-sm font-bold mx-1 truncate w-full">{walletAddress}</span>
      </div>
      <button
        className="flex flex-row gap-1 items-center border-2 border-gray-30 border-opacity-75 rounded p-1"
        onClick={() => {
          navigator.clipboard.writeText(walletAddress + '');
          toast('Copied to clipboard');
        }}
        type="button"
      >
        <Copy />
        <span className="text-gray-80 uppercase leading-none">copy</span>
      </button>
    </div>
  );
};
