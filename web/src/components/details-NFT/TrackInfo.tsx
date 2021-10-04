import { Badge } from 'components/Badge';
import { LoaderAnimation } from 'components/LoaderAnimation';
import { ChainLink } from 'icons/ChainLink';
import { Matic } from 'icons/Matic';
import { Pinata } from 'icons/Pinata';

interface TrackInfoProps {
  trackTitle: string;
  albumTitle: string;
  releaseYear: number;
}

export const TrackInfo = ({ trackTitle, albumTitle, releaseYear }: TrackInfoProps) => {
  return (
    <div className="w-full text-white">
      <div className="flex items-center px-4">
        <div className="text-gray-80 w-2/4">
          Track Title
        </div>
        <div className="text-center w-2/4">
          Come Together
        </div>
      </div>
      <div className="flex items-center px-4">
        <div className="text-gray-80 w-2/4">
          Album Title
        </div>
        <div className="text-center w-2/4">
          Abbey Road
        </div>
      </div>
      <div className="flex items-center px-4">
        <div className="text-gray-80 w-2/4">
          Release Year
        </div>
        <div className="text-center w-2/4">
          2021
        </div>
      </div>
      <div className="flex items-center px-4">
        <div className="text-gray-80 w-2/4">
          Genres
        </div>
        <div className="text-center w-2/4">
          <Badge
            label={"Electronic"}
            selected={false}
            onClick={() => false}
            className="mr-2"
          />
        </div>
      </div>
      <div className="flex items-center px-4">
        <div className="text-gray-80 w-2/4">
          Minting Status
        </div>
        <div className="text-center w-2/4 flex items-center">
          <LoaderAnimation loadingMessage="" />
          In progress...
        </div>
      </div>
      <div className="flex items-center px-4">
        <div className="text-gray-80 flex items-center w-48">
          <Pinata className="mr-2" />
          Pinata IPFS
        </div>
        <div className="text-center flex items-center text-sm overflow-hidden">
          <div className="overflow-visible ml-2">
            <ChainLink className="mr-2 scale-150" />
          </div>
          <div className="text-sm overflow-ellipsis overflow-hidden text-gray-80 cursor-pointer">
            https://gateway.pinata.cloud/ipfs/SqRgfh$5Jht52gsfh
          </div>
        </div>
      </div>
      <div className="flex items-center px-4">
        <div className="text-gray-80 flex items-center w-40">
          <Matic className="mr-2" />
          Token ID
        </div>
        <div className="text-center flex items-center text-sm overflow-hidden">
          <div className="overflow-visible ml-2">
            <ChainLink className="mr-2 scale-150" />
          </div>
          <div className="text-sm overflow-ellipsis overflow-hidden text-gray-80 cursor-pointer">
            0x285672hS4Gf6237GQedy51fhdhdgfdgfdg
          </div>
        </div>
      </div>
    </div>
  )
}