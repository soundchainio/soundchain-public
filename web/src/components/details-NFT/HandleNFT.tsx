import { Button } from 'components/Button';
import { useMe } from 'hooks/useMe';
import { CheckmarkFilled } from 'icons/CheckmarkFilled';
import { Matic } from 'icons/Matic';
import { XMarkFilled } from 'icons/XMark';
import { useRouter } from 'next/router';
import React from 'react';

interface HandleNFTProps {
  isOwner: boolean;
  isForSale: boolean;
  canList: boolean;
  price: string | undefined;
}

export const HandleNFT = ({ isOwner, isForSale, price, canList }: HandleNFTProps) => {
  const router = useRouter();
  const me = useMe();

  const handleListButton = () => {
    me ? router.push(`${router.asPath}/list`) : router.push('/login');
  };

  if (isOwner && isForSale && price) {
    return (
      <div className="w-full bg-black text-white flex items-center py-3">
        <div className="flex flex-col flex-1 ml-4">
          <div className="text-md flex items-center font-bold gap-1">
            <Matic />
            <span>{price}</span>
            <span className="text-xs text-gray-80">MATIC</span>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <Button variant="edit-listing" onClick={() => router.push(`${router.asPath}/edit`)}>
            EDIT LISTING
          </Button>
        </div>
      </div>
    );
  } else if (isForSale && price) {
    return (
      <div className="w-full bg-black text-white flex items-center py-3">
        <div className="flex flex-col flex-1 ml-4">
          <div className="text-md flex items-center font-bold gap-1">
            <Matic />
            <span>{price}</span>
            <span className="text-xs text-gray-80">MATIC</span>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <Button variant="buy-nft" onClick={() => router.push(`${router.asPath}/buy`)}>
            BUY NFT
          </Button>
        </div>
      </div>
    );
  } else if (!canList) {
    return (
      <div className="w-full bg-black text-white flex justify-center items-center py-3">
        <div className="flex items-center gap-2 text-sm font-bold">
          <XMarkFilled />
          You have to be verified to list your NFT
        </div>
      </div>
    );
  } else if (isOwner) {
    return (
      <div className="w-full bg-black text-white flex items-center py-3">
        <div className="flex items-center flex-1 gap-2 text-sm font-bold pl-4">
          <CheckmarkFilled />
          You own this NFT
        </div>
        <div className="flex-1 flex items-center justify-center">
          <Button variant="list-nft" onClick={handleListButton}>
            <div className="px-4 font-bold">LIST NFT </div>
          </Button>
        </div>
      </div>
    );
  }
  return null;
};
