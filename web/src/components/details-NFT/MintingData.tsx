import { Avatar } from 'components/Avatar';
import { config } from 'config';
import { ChainLink } from 'icons/ChainLink';
import { Pinata } from 'icons/Pinata';
import { Token } from 'icons/Token';
import { Profile } from 'lib/graphql';
import React from 'react';

interface MintingDataProps {
  ipfsCid?: string | null;
  transactionHash?: string | null;
  ownerProfile: Partial<Profile>;
}

export const MintingData = ({ ipfsCid, transactionHash, ownerProfile }: MintingDataProps) => {
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
          <a
            href={`${config.ipfsGateway}${ipfsCid}`}
            target="_blank"
            className="text-sm overflow-ellipsis overflow-hidden text-gray-80 cursor-pointer"
            rel="noreferrer"
          >
            {ipfsCid}
          </a>
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
          <a
            href={`${config.polygonscan}tx/${transactionHash}`}
            target="_blank"
            className="text-sm overflow-ellipsis overflow-hidden text-gray-80 cursor-pointer"
            rel="noreferrer"
          >
            {transactionHash}
          </a>
        </div>
      </div>
      <div className="flex items-center text-xxs text-white px-4 py-3 pb-20">
        <div className="w-1/6 uppercase text-xs text-gray-CC font-bold mr-1">Owner</div>
        <div className="flex w-3/6 gap-2">
          <Avatar
            profile={{ profilePicture: ownerProfile?.profilePicture, id: ownerProfile?.id }}
            pixels={30}
            linkToProfile
          />
          <div className="flex flex-col">
            <div className="text-sm font-bold">{ownerProfile?.displayName}</div>
            <div className="text-xxs text-gray-CC font-bold">@{ownerProfile?.userHandle}</div>
          </div>
        </div>
        <div className="flex flex-col w-1/6">
          <div className="text-center text-sm font-bold">{ownerProfile?.followerCount}</div>
          <div className="text-center text-gray-CC font-bold">Followers</div>
        </div>
        <div className="flex flex-col w-1/6">
          <div className="text-center text-sm font-bold">{ownerProfile?.followingCount}</div>
          <div className="text-center text-gray-CC font-bold">Following</div>
        </div>
      </div>
    </>
  );
};
