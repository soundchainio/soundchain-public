import classNames from 'classnames';
import { Button, ButtonVariant } from 'components/Button';
import { TimeCounter } from 'components/TimeCounter';
import { useAudioPlayerContext } from 'hooks/useAudioPlayer';
import { CheckmarkFilled } from 'icons/CheckmarkFilled';
import { Matic } from 'icons/Matic';
import NextLink from 'next/link';
import { useRouter } from 'next/router';
import React from 'react';

interface HandleNFTProps {
  isOwner: boolean;
  canList: boolean;
  price: string | undefined | null;
  isAuction: boolean;
  isBuyNow: boolean;
  canComplete: boolean;
  auctionIsOver: boolean;
  countBids: number;
  endingDate: Date;
}

export const HandleNFT = ({
  isOwner,
  price,
  canList,
  isAuction,
  isBuyNow,
  canComplete,
  auctionIsOver,
  countBids,
  endingDate,
}: HandleNFTProps) => {
  const router = useRouter();

  if (isOwner) {
    if (!canList) {
      return (
        <ListingAction href={`/get-verified`} action="GET VERIFIED">
          You must be verified in order to sell NFT’s.
        </ListingAction>
      );
    }
    if (isBuyNow || (isAuction && !auctionIsOver)) {
      return (
        <ListedAction
          href={isBuyNow ? `${router.asPath}/edit/buy-now` : `${router.asPath}/edit/auction`}
          price={price}
          action="EDIT LISTING"
          variant="edit-listing"
        />
      );
    }
    if (isAuction && auctionIsOver) {
      return null;
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
      return <ListedAction href={`${router.asPath}/buy-now`} price={price} action="BUY NFT" variant="buy-nft" />;
    }
    if (price && isAuction && !auctionIsOver) {
      return (
        <ListedAction
          href={`${router.asPath}/place-bid`}
          countBids={countBids}
          endingDate={endingDate}
          price={price}
          action="PLACE BID"
          variant="buy-nft"
        />
      );
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
  const { currentSong } = useAudioPlayerContext();
  return (
    <div
      className={classNames(
        'w-full bg-black text-white flex items-center py-3 fixed',
        currentSong.src ? 'bottom-36' : 'bottom-20',
      )}
    >
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
  price: string | undefined | null;
  action: string;
  variant: ButtonVariant;
  countBids?: number;
  endingDate?: Date;
}

const ListedAction = ({ href, price, action, variant, countBids, endingDate }: ListedActionProps) => {
  return (
    <div className="w-full bg-black text-white flex items-center py-3 fixed bottom-20">
      <div className="flex flex-col flex-1 ml-4">
        <div className="text-md flex items-center font-bold gap-1">
          <Matic />
          <span>{price}</span>
          <span className="text-xs text-gray-80">MATIC</span>
        </div>
      </div>
      {endingDate && (
        <div className="flex flex-col text-xs items-center ">
          {countBids != 0 && <span className="text-blue-400 font-bold">({countBids} bids)</span>}
          <TimeCounter date={endingDate}>
            {(days, hours, minutes, seconds) => (
              <div>
                {days !== 0 && (
                  <>
                    <span className="text-gray-80">{days}D </span>
                  </>
                )}
                {hours !== 0 && (
                  <>
                    <span className="text-gray-80">{hours}H </span>
                  </>
                )}
                {minutes !== 0 && (
                  <>
                    <span className="text-gray-80">{minutes}M </span>
                  </>
                )}
                {seconds !== 0 && (
                  <>
                    <span className="text-gray-80">{seconds}S</span>
                  </>
                )}
              </div>
            )}
          </TimeCounter>
        </div>
      )}
      <div className="flex-1 flex items-center justify-center">
        <NextLink href={href}>
          <Button variant={variant}>{action}</Button>
        </NextLink>
      </div>
    </div>
  );
};
