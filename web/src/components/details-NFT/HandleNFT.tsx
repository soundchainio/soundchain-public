import { Button, ButtonVariant } from 'components/Button';
import PlayerAwareBottomBar from 'components/PlayerAwareBottomBar';
import { TimeCounter } from 'components/TimeCounter';
import { useModalDispatch } from 'contexts/providers/modal';
import { CheckmarkFilled } from 'icons/CheckmarkFilled';
import { Matic } from 'icons/Matic';
import { useMaticUsdQuery } from 'lib/graphql';
import NextLink from 'next/link';
import { useRouter } from 'next/router';
import React from 'react';
import { currency } from 'utils/format';

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
  auctionId: string;
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
  auctionId,
}: HandleNFTProps) => {
  const router = useRouter();
  if (isOwner) {
    if (!canList) {
      return (
        <ListingAction href={`/get-verified`} action="GET VERIFIED" auctionId={auctionId}>
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
          auctionId={auctionId}
        />
      );
    }
    if (isAuction && (auctionIsOver || countBids > 0)) {
      return (
        <AuctionDetails
          auctionIsOver={auctionIsOver}
          countBids={countBids}
          endingDate={endingDate}
          price={price}
          cancelHref={`${router.asPath}/cancel-auction`}
          completeHref={`${router.asPath}/complete-auction`}
          auctionId={auctionId}
        />
      );
    }
    return (
      <ListingAction href={`${router.asPath}/list`} action="LIST NFT" auctionId={auctionId}>
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
          startingDate={startingDate}
          endingDate={endingDate}
          price={price}
          action="PLACE BID"
          variant="buy-nft"
        />
      );
    }
    if (canComplete && isAuction) {
      return (
        <ListedAction href={`${router.asPath}/complete-auction`} price={price} action="COMPLETE" variant="buy-nft" />
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
    <PlayerAwareBottomBar>
      <div className="flex items-center flex-1 gap-2 text-sm font-bold pl-4">{children}</div>
      <div className="flex-1 flex items-center justify-end">
        <NextLink href={href}>
          <Button variant="list-nft">
            <div className="px-4 font-bold">{action}</div>
          </Button>
        </NextLink>
      </div>
    </PlayerAwareBottomBar>
  );
};

interface ListedActionProps {
  href: string;
  price: string | undefined | null;
  action: string;
  variant: ButtonVariant;
  auctionId: string;
  countBids?: number;
  startingDate?: Date;
  endingDate?: Date;
}

const ListedAction = ({
  href,
  price,
  action,
  variant,
  countBids,
  startingDate,
  endingDate,
  auctionId,
}: ListedActionProps) => {
  const futureSale = startingDate && startingDate.getTime() > new Date().getTime();
  const { data: maticUsd } = useMaticUsdQuery();

  const { dispatchShowBidsHistory } = useModalDispatch();
  return (
    <PlayerAwareBottomBar>
      <div className="flex flex-col flex-1">
        <div className="text-md flex items-center font-bold gap-1">
          <span>{price}</span>
          <Matic />
          <span className="text-xl text-gray-80"> {maticUsd && price && '≃'} </span>
          <span className="text-gray-80 font-normal">
            {maticUsd && price && `${currency(parseFloat(price) * parseFloat(maticUsd.maticUsd))}`}
          </span>
        </div>
      </div>
      {futureSale && startingDate && (
        <div className="flex flex-col text-xs items-center px-1">
          <Timer date={startingDate} />
        </div>
      )}
      {endingDate && !futureSale && (
        <div className="flex flex-col text-xs items-center px-1">
          {countBids != 0 && (
            <span className="text-blue-400 font-bold" onClick={() => dispatchShowBidsHistory(true, auctionId)}>
              [{countBids} bids]
            </span>
          )}
          <Timer date={endingDate} />
        </div>
      )}
      <div className="flex-1 flex items-center justify-end">
        <NextLink href={href}>
          <Button variant={variant}>{action}</Button>
        </NextLink>
      </div>
    </PlayerAwareBottomBar>
  );
};

interface AuctionDetailsProps {
  cancelHref: string;
  auctionIsOver: boolean;
  price: string | undefined | null;
  countBids?: number;
  endingDate?: Date;
  completeHref: string;
  auctionId: string;
}

const AuctionDetails = ({
  auctionIsOver,
  price,
  countBids,
  endingDate,
  cancelHref,
  completeHref,
  auctionId,
}: AuctionDetailsProps) => {
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
        {auctionIsOver && countBids === 0 && (
          <div className="flex-1 flex items-center justify-end">
            <NextLink href={cancelHref}>
              <Button variant="edit-listing">CANCEL AUCTION</Button>
            </NextLink>
          </div>
        )}
        {countBids != 0 && (
          <ListedAction href={completeHref} price={price} action="COMPLETE" variant="buy-nft" auctionId={auctionId} />
        )}
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
  const router = useRouter();
  return (
    <TimeCounter
      date={date}
      onEndTimer={() => {
        if (date.getTime() > new Date().getTime()) {
          router.reload();
        }
      }}
    >
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
