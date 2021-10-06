import { LoaderAnimation } from 'components/LoaderAnimation';
import { ChainLink } from 'icons/ChainLink';
import { Pinata } from 'icons/Pinata';
import { Token } from 'icons/Token';

interface MintingDataProps {
  pinataIPFS?: string;
  tokenId?: string;
}

export const MintingData = ({
  pinataIPFS = 'https://gateway.pinata.cloud/ipfs/SqRgfh$5Jht52gsfh',
  tokenId = '0x285672hS4Gf6237GQedy51fhdhdgfdgfdg'
}: MintingDataProps) => {
  return (
    <>
      <div className="flex items-center">
        <div className="text-white w-2/4 uppercase text-sm bg-gray-20 pl-4 py-1 text-sm">
          Minting Status
        </div>
        <div className="text-white w-2/4 text-sm bg-gray-30 pr-4 py-1 flex items-center justify-center">
          <LoaderAnimation ring={true} />
          In progress...
        </div>
      </div>
      <div className="flex items-center bg-gray-10">
        <div className="text-white flex items-center w-56 pl-4 py-1 text-sm">
          <Pinata className="mr-2" />
          Pinata IPFS
        </div>
        <div className="text-center flex items-center text-sm overflow-hidden pr-4 py-1">
          <div className="overflow-visible ml-2">
            <ChainLink className="mr-2 scale-150" />
          </div>
          <div className="text-sm overflow-ellipsis overflow-hidden text-gray-80 cursor-pointer">
            {pinataIPFS}
          </div>
        </div>
      </div>
      <div className="flex items-center">
        <div className="text-white text-sm flex items-center w-40 pl-4 py-1">
          <Token className="mr-2" />
          Token ID
        </div>
        <div className="text-center flex items-center text-sm overflow-hidden">
          <div className="overflow-visible ml-2">
            <ChainLink className="mr-2 scale-150" />
          </div>
          <div className="text-sm overflow-ellipsis overflow-hidden text-gray-80 cursor-pointer pr-4">
            {tokenId}
          </div>
        </div>
      </div>
    </>
  )
}
