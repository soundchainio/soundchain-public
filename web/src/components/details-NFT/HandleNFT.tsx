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
  startingDate?: Date;
  endingDate?: Date;
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
  startingDate,
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
    if (isBuyNow || (isAuction && !auctionIsOver && countBids === 0)) {
      return (
        <ListedAction
          href={isBuyNow ? `${router.asPath}/edit/buy-now` : `${router.asPath}/edit/auction`}
          price={price}
          countBids={countBids}
          startingDate={startingDate}
          endingDate={endingDate}
          action="EDIT LISTING"
          variant="edit-listing"
        />
      );
    }
    if (isAuction && (auctionIsOver || countBids > 0)) {
      return (
        <AuctionDetails auctionIsOver={auctionIsOver} countBids={countBids} endingDate={endingDate} price={price} />
      );
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
      return (
        <ListedAction
          href={`${router.asPath}/buy-now`}
          price={price}
          action="BUY NFT"
          variant="buy-nft"
          startingDate={startingDate}
        />
      );
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
        'bg-black text-white flex items-center py-3 px-4 fixed right-0 md:left-64 left-0',
        currentSong.src ? 'bottom-36 md:bottom-16' : 'bottom-20 md:bottom-0',
      )}
    >
      <div className="flex items-center flex-1 gap-2 text-sm font-bold pl-4">{children}</div>
      <div className="flex-1 flex items-center justify-end">
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
  startingDate?: Date;
  endingDate?: Date;
}

const ListedAction = ({ href, price, action, variant, countBids, startingDate, endingDate }: ListedActionProps) => {
  const { currentSong } = useAudioPlayerContext();
  const futureSale = startingDate && startingDate.getTime() > new Date().getTime();
  return (
    <div
      className={classNames(
        'bg-black text-white flex items-center py-3 px-4 fixed right-0 md:left-64 left-0',
        currentSong.src ? 'bottom-36 md:bottom-16' : 'bottom-20 md:bottom-0',
      )}
    >
      <div className="flex flex-col flex-1">
        <div className="text-md flex items-center font-bold gap-1">
          <Matic />
          <span>{price}</span>
          <span className="text-xs text-gray-80">MATIC</span>
        </div>
      </div>
      {futureSale && (
        <div className="flex flex-col text-xs items-center px-1">
          <div className="font-bold">Sale starts</div>
          <Timer date={startingDate} />
        </div>
      )}
      {endingDate && !futureSale && (
        <div className="flex flex-col text-xs items-center px-1">
          <div className="font-bold">Sale ends</div>
          {countBids != 0 && <span className="text-blue-400 font-bold">({countBids} bids)</span>}
          <Timer date={endingDate} />
        </div>
      )}
      <div className="flex-1 flex items-center justify-end">
        <NextLink href={href}>
          <Button variant={variant}>{action}</Button>
        </NextLink>
      </div>
    </div>
  );
};

interface AuctionDetailsProps {
  auctionIsOver: boolean;
  price: string | undefined | null;
  countBids?: number;
  endingDate?: Date;
}

const AuctionDetails = ({ auctionIsOver, price, countBids, endingDate }: AuctionDetailsProps) => {
  return (
    <div className="w-full bg-black text-white flex items-center py-3 px-4">
      <div className="flex flex-col flex-1">
        <div className="text-md flex items-center font-bold gap-1">
          <Matic />
          <span>{price}</span>
          <span className="text-xs text-gray-80">MATIC</span>
        </div>
      </div>
      <div className="text-center">
        {auctionIsOver && countBids === 0 && <div className="uppercase font-bold">Auction ended with no bids</div>}
        {countBids != 0 && <div className="text-xs font-bold text-blue-400">({countBids} bids)</div>}
        {endingDate && (
          <div className="flex flex-col text-xs items-center ">
            <Timer date={endingDate} />
          </div>
        )}
      </div>
    </div>
  );
};

const Timer = ({ date }: { date: Date }) => {
  return (
    <TimeCounter date={date}>
      {(days, hours, minutes) => (
        <div>
          {days !== 0 && (
            <>
              {days} <span className="text-gray-80">days </span>
            </>
          )}
          {hours !== 0 && (
            <>
              {hours} <span className="text-gray-80">hours </span>
            </>
          )}
          {minutes !== 0 && (
            <>
              {minutes} <span className="text-gray-80">minutes </span>
            </>
          )}
        </div>
      )}
    </TimeCounter>
  );
};
