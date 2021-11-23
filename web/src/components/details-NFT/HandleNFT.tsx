import { Button, ButtonVariant } from 'components/Button';
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
  canComplete: boolean;
  auctionIsOver: boolean;
}

export const HandleNFT = ({
  isOwner,
  price,
  canList,
  isAuction,
  isBuyNow,
  canComplete,
  auctionIsOver,
}: HandleNFTProps) => {
  const router = useRouter();

  // TODO check if all states are covered and test
  if (isOwner) {
    if (!canList) {
      return (
        <ListingAction href={`${router.asPath}/get-verified`} action="GET VERIFIED">
          You must be verified in order to sell NFT’s.
        </ListingAction>
      );
    }
    if (isBuyNow || (!auctionIsOver && isAuction)) {
      return <ListedAction href={`${router.asPath}/edit`} price={price} action="EDIT LISTING" variant="edit-listing" />;
    }
    return (
      <ListingAction href={`${router.asPath}/list`} action="LIST NFT">
        <CheckmarkFilled />
        You own this NFT
      </ListingAction>
    );
    // not the owner
  } else {
    if (price && isBuyNow) {
      return <ListedAction href={`${router.asPath}/buy`} price={price} action="BUY NFT" variant="buy-nft" />;
    }
    if (price && isAuction) {
      return <ListedAction href={`${router.asPath}/place-bid`} price={price} action="PLACE BID" variant="buy-nft" />;
    }
    if (canComplete && isAuction) {
      return (
        <ListedAction
          href={`${router.asPath}/complete-auction`}
          price={price}
          action="COMPLETE AUCTION"
          variant="buy-nft"
        />
      );
    }
  }
  return null;
};

interface ListingActionProps {
  href: string;
  action: string;
}

const ListingAction = ({ href, action, children }: React.PropsWithChildren<ListingActionProps>) => {
  return (
    <div className="w-full bg-black text-white flex items-center py-3">
      <div className="flex items-center flex-1 gap-2 text-sm font-bold pl-4">{children}</div>
      <div className="flex-1 flex items-center justify-center">
        <NextLink href={href}>
          <Button variant="list-nft">
            <div className="px-4 font-bold">{action}</div>
          </Button>
        </NextLink>
      </div>
    </div>
  );
};

interface ListedActionProps {
  href: string;
  price: string | undefined;
  action: string;
  variant: ButtonVariant;
}

const ListedAction = ({ href, price, action, variant }: ListedActionProps) => {
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
        <NextLink href={href}>
          <Button variant={variant}>{action}</Button>
        </NextLink>
      </div>
    </div>
  );
};
