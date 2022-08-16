import { Button, ButtonVariant } from 'components/Button';
import { Matic } from 'components/Matic';
import { Ogun } from 'components/Ogun';
import PlayerAwareBottomBar from 'components/PlayerAwareBottomBar';
import { TimeCounter } from 'components/TimeCounter';
import { useModalDispatch } from 'contexts/providers/modal';
import { CheckmarkFilled } from 'icons/CheckmarkFilled';
import NextLink from 'next/link';
import { useRouter } from 'next/router';
import React from 'react';

interface HandleNFTProps {
  isOwner: boolean;
  canList: boolean;
  price: number;
  OGUNprice: number;
  isAuction: boolean;
  isBuyNow: boolean;
  canComplete: boolean;
  auctionIsOver: boolean;
  countBids: number;
  startingDate?: Date;
  endingDate?: Date;
  auctionId: string;
  wasCancel?: boolean;
  isPaymentOGUN?: boolean;
  multipleEdition?: boolean;
}

export const HandleNFT = ({
  isOwner,
  price,
  OGUNprice,
  canList,
  isAuction,
  isBuyNow,
  canComplete,
  auctionIsOver,
  countBids,
  startingDate,
  endingDate,
  auctionId,
  wasCancel,
  isPaymentOGUN,
  multipleEdition = false
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
          OGUNprice={OGUNprice}
          isPaymentOGUN={isPaymentOGUN}
          countBids={countBids}
          startingDate={startingDate}
          endingDate={endingDate}
          action="EDIT LISTING"
          variant="edit-listing"
          auctionId={auctionId}
          isOwner={isOwner}
        />
      );
    }
    if (isAuction && (auctionIsOver || countBids > 0) && !wasCancel) {
      return (
        <AuctionDetails
          auctionIsOver={auctionIsOver}
          countBids={countBids}
          endingDate={endingDate}
          price={price}
          cancelHref={`${router.asPath}/cancel-auction`}
          completeHref={`${router.asPath}/complete-auction`}
          auctionId={auctionId}
          canComplete={canComplete}
        />
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
    if (OGUNprice && price && isBuyNow) {
      return (
        <>
          <ListedAction
            href={`${router.asPath}/buy-now`}
            price={price}
            OGUNprice={OGUNprice}
            isPaymentOGUN={isPaymentOGUN}
            action="BUY NFT WITH MATIC"
            secondAction="BUY NFT WITH OGUN"
            variant="buy-nft"
            startingDate={startingDate}
          />
        </>
      );
    }
    if (OGUNprice && isBuyNow) {
      return (
        <ListedAction
          href={`${router.asPath}/buy-now`}
          price={price}
          OGUNprice={OGUNprice}
          isPaymentOGUN={isPaymentOGUN}
          action="BUY NFT WITH OGUN"
          variant="buy-nft"
          startingDate={startingDate}
        />
      );
    }
    if (price && isBuyNow && !multipleEdition) {
      return (
        <ListedAction
          href={`${router.asPath}/buy-now`}
          price={price}
          OGUNprice={OGUNprice}
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
          OGUNprice={OGUNprice}
          action="PLACE BID"
          variant="buy-nft"
          auctionId={auctionId}
          isPaymentOGUN={isPaymentOGUN}
        />
      );
    }
    if (canComplete && isAuction) {
      return (
        <ListedAction href={`${router.asPath}/complete-auction`} price={price} OGUNprice={OGUNprice} action="COMPLETE" variant="buy-nft" />
      );
    }
  }
  return null;
};

interface ListingActionProps {
  href: string;
  action: string;
}

export const ListingAction = ({ href, action, children }: React.PropsWithChildren<ListingActionProps>) => {
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
  isOwner?: boolean;
  href?: string;
  price: number;
  OGUNprice: number;
  action: string;
  secondAction?: string;
  variant: ButtonVariant;
  countBids?: number;
  startingDate?: Date;
  endingDate?: Date;
  auctionId?: string;
  isPaymentOGUN?: boolean;
  onClick?: () => void;
}

export const ListedAction = ({
  href,
  price,
  OGUNprice,
  action,
  secondAction,
  variant,
  countBids,
  startingDate,
  endingDate,
  auctionId,
  isPaymentOGUN,
  onClick,
}: ListedActionProps) => {
  const futureSale = startingDate && startingDate.getTime() > new Date().getTime();

  const { dispatchShowBidsHistory } = useModalDispatch();
  return (
    <PlayerAwareBottomBar>
      <div className="flex flex-col flex-1">
        <div className="text-sm flex items-center font-bold gap-1">
          {!!auctionId ? (
            <>
            {!!isPaymentOGUN ? (
              <Ogun value={OGUNprice ?? 0} variant="currency" />
            ) : (
              <Matic value={price} variant="currency" />
            )}
            </>
          ):(
            <>
            {!!price && <Matic value={price} variant="currency" />}
            {!!(OGUNprice) && <Ogun value={OGUNprice ?? 0} variant="currency" />}
            </>
          )}
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
            <button className="text-blue-400 font-bold" onClick={() => dispatchShowBidsHistory(true, auctionId || '')}>
              [{countBids} bids]
            </button>
          )}
          <Timer date={endingDate} />
        </div>
      )}
      <div className="flex flex-1 items-center justify-end">
        {href &&
          (!!auctionId ? (
            <NextLink href={{ pathname: href, query: { isPaymentOGUN: !!isPaymentOGUN } }} replace>
              <Button variant={variant}>{action}</Button>
            </NextLink>
          ) : (
            <>
              <NextLink href={{ pathname: href, query: { isPaymentOGUN: !!isPaymentOGUN } }} replace>
                <Button variant={variant}>{action}</Button>
              </NextLink>
              {secondAction && (
                <NextLink href={{ pathname: href, query: { isPaymentOGUN: !!isPaymentOGUN } }} replace>
                  <Button variant={variant}>{secondAction}</Button>
                </NextLink>
              )}
            </>
          ))}
        {onClick && (
          <Button variant={variant} onClick={onClick}>
            {action}
          </Button>
        )}
      </div>
    </PlayerAwareBottomBar>
  );
};

interface AuctionDetailsProps {
  cancelHref: string;
  auctionIsOver: boolean;
  price: number;
  countBids?: number;
  endingDate?: Date;
  completeHref: string;
  auctionId: string;
  canComplete: boolean;
  isPaymentOGUN?: boolean;
}

const AuctionDetails = ({
  auctionIsOver,
  price,
  countBids,
  endingDate,
  cancelHref,
  completeHref,
  auctionId,
  canComplete,
  isPaymentOGUN,
}: AuctionDetailsProps) => {
  return (
    <div className="w-full bg-black text-white flex items-center py-3 px-4">
      <div className="flex flex-col flex-1">
        {isPaymentOGUN ? (
          <Ogun value={price} variant="currency" />
        ):(
          <Matic value={price} variant="currency" />
        )}
      </div>
      <div className="text-center">
        {auctionIsOver && countBids === 0 && (
          <div className="flex-1 flex items-center justify-end">
            <NextLink href={cancelHref} replace>
              <Button variant="edit-listing">CANCEL AUCTION</Button>
            </NextLink>
          </div>
        )}
        {canComplete && countBids != 0 && (
          <ListedAction href={completeHref} isPaymentOGUN={isPaymentOGUN} price={price} OGUNprice={price} action="COMPLETE" variant="buy-nft" auctionId={auctionId} />
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
              {days} <span className="text-gray-80">d </span>
            </>
          )}
          {hours !== 0 && (
            <>
              {hours} <span className="text-gray-80">h </span>
            </>
          )}
          {minutes !== 0 && (
            <>
              {minutes} <span className="text-gray-80">min </span>
            </>
          )}
        </div>
      )}
    </TimeCounter>
  );
};
