import { Button } from 'components/Button';
import { useMe } from 'hooks/useMe';
import { CheckmarkFilled } from 'icons/CheckmarkFilled';
import { Matic } from 'icons/Matic';
import NextLink from 'next/link';
import { useRouter } from 'next/router';
import React from 'react';

interface HandleNFTProps {
  isOwner: boolean;
  canList: boolean;
  price: string | undefined;
  isAuction: boolean;
  isBuyNow: boolean;
}

export const HandleNFT = ({ isOwner, price, canList, isAuction, isBuyNow }: HandleNFTProps) => {
  const router = useRouter();
  const me = useMe();

  const handleListButton = () => {
    me ? router.push(`${router.asPath}/list`) : router.push('/login');
  };

  if (isOwner && (isAuction || isBuyNow)) {
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
          <NextLink href={`${router.asPath}/edit`} passHref>
            <a aria-label="Edit Listing">
              <Button variant="edit-listing">EDIT LISTING</Button>
            </a>
          </NextLink>
        </div>
      </div>
    );
  } else if (price && isBuyNow) {
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
          <NextLink href={`${router.asPath}/buy`} passHref>
            <a aria-label="Buy NFT">
              <Button variant="buy-nft">BUY NFT</Button>
            </a>
          </NextLink>
        </div>
      </div>
    );
  } else if (price && isAuction) {
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
          <NextLink href={`${router.asPath}/place-bid`}>
            <Button variant="buy-nft">PLACE BID</Button>
          </NextLink>
        </div>
      </div>
    );
  } else if (!canList) {
    return (
      <div className="w-full bg-black text-white flex items-center py-3">
        <div className="flex items-center flex-1 gap-2 text-sm font-bold pl-4">
          You must be verified in order to sell NFT’s.
        </div>
        <div className="flex-1 flex items-center justify-center">
          <NextLink href="/get-verified" passHref>
            <a aria-label="Get Verified">
              <Button variant="list-nft">
                <div className="px-4 font-bold">GET VERIFIED</div>
              </Button>
            </a>
          </NextLink>
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
          <NextLink href={`${router.asPath}/list`} passHref>
            <a aria-label="List NFT">
              <Button variant="list-nft" onClick={handleListButton}>
                <div className="px-4 font-bold">LIST NFT</div>
              </Button>
            </a>
          </NextLink>
        </div>
      </div>
    );
  }
  return null;
};
