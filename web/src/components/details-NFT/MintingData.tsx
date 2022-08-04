import { ProfileWithAvatar } from 'components/ProfileWithAvatar';
import { config } from 'config';
import { ChainLink } from 'icons/ChainLink';
import { Pinata } from 'icons/Pinata';
import { Token } from 'icons/Token';
import { Profile } from 'lib/graphql';

interface MintingDataProps {
  ipfsCid?: string | null;
  transactionHash?: string | null;
  ownerProfile?: Partial<Profile>;
}

export const MintingData = ({ ipfsCid, transactionHash, ownerProfile }: MintingDataProps) => {
  return (
    <>
      <div className="flex items-center bg-gray-10 font-bold">
        <div className="flex w-2/4 flex-shrink-0 items-center gap-2 py-3 pl-4 text-xs text-gray-CC">
          <Pinata />
          Pinata IPFS
        </div>
        <div className="flex items-center overflow-hidden py-3 pr-4 text-sm">
          <div className="ml-2">
            <ChainLink className="mr-2 scale-150" />
          </div>
          <a
            href={`${config.ipfsGateway}${ipfsCid}`}
            target="_blank"
            className="overflow-hidden overflow-ellipsis text-sm text-xxs text-gray-80"
            rel="noreferrer"
          >
            {ipfsCid}
          </a>
        </div>
      </div>
      <div className="flex items-center font-bold">
        <div className="flex w-2/4 flex-shrink-0 items-center gap-2 py-3 pl-4 text-xs text-gray-CC">
          <Token />
          Token ID
        </div>
        <div className="flex items-center overflow-hidden py-3 pr-4 text-sm">
          <div className="ml-2">
            <ChainLink className="mr-2 scale-150" />
          </div>
          <a
            href={`${config.polygonscan}tx/${transactionHash}`}
            target="_blank"
            className="overflow-hidden overflow-ellipsis text-xxs text-gray-80"
            rel="noreferrer"
          >
            {transactionHash}
          </a>
        </div>
      </div>
      {ownerProfile && (
        <div className="flex items-center px-4 py-3 pb-20 text-xxs text-white">
          <div className="mr-1 w-1/6 text-xs font-bold uppercase text-gray-CC">Owner</div>
          <div className="w-3/6">
            <ProfileWithAvatar profile={ownerProfile} />
          </div>
          <div className="flex w-1/6 flex-col">
            <div className="text-center text-sm font-bold">{ownerProfile?.followerCount}</div>
            <div className="text-center font-bold text-gray-CC">Followers</div>
          </div>
          <div className="flex w-1/6 flex-col">
            <div className="text-center text-sm font-bold">{ownerProfile?.followingCount}</div>
            <div className="text-center font-bold text-gray-CC">Following</div>
          </div>
        </div>
      )}
    </>
  );
};
