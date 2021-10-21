import { ChainLink } from 'icons/ChainLink';
import { Pinata } from 'icons/Pinata';
import { Token } from 'icons/Token';

interface MintingDataProps {
  ipfsCid?: string | null;
  transactionHash?: string | null;
}

export const MintingData = ({ ipfsCid, transactionHash }: MintingDataProps) => {
  return (
    <>
      <div className="flex items-center font-bold bg-gray-10">
        <div className="flex-shrink-0 text-white flex gap-2 items-center w-56 pl-4 py-3 text-sm">
          <Pinata />
          Pinata IPFS
        </div>
        <div className="flex items-center text-sm overflow-hidden pr-4 py-3">
          <div className="ml-2">
            <ChainLink className="mr-2 scale-150" />
          </div>
          <div className="text-sm overflow-ellipsis overflow-hidden text-gray-80 cursor-pointer">{ipfsCid}</div>
        </div>
      </div>
      <div className="flex items-center font-bold">
        <div className="flex-shrink-0 text-white flex gap-2 items-center w-56 pl-4 py-3 text-sm">
          <Token />
          Transaction Hash
        </div>
        <div className="flex items-center text-sm overflow-hidden pr-4 py-3">
          <div className="ml-2">
            <ChainLink className="mr-2 scale-150" />
          </div>
          <div className="text-sm overflow-ellipsis overflow-hidden text-gray-80 cursor-pointer">{transactionHash}</div>
        </div>
      </div>
    </>
  );
};
