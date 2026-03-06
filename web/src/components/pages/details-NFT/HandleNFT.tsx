import { Button, ButtonVariant } from 'components/common/Buttons/Button'
import { Matic } from 'components/Matic'
import { Ogun } from 'components/Ogun'
import PlayerAwareBottomBar from 'components/PlayerAwareBottomBar'
import { TimeCounter } from 'components/common/Timer/TimeCounter'
import { useModalDispatch } from 'contexts/ModalContext'
import { CheckmarkFilled } from 'icons/CheckmarkFilled'
import NextLink, { LinkProps } from 'next/link'
import { useRouter } from 'next/router'
import React, { useState } from 'react'
import { Users, ArrowRightLeft } from 'lucide-react'
import { ManageRoyaltySplitterModal } from 'components/modals/ManageRoyaltySplitterModal'
import { BridgeNFTModal } from 'components/modals/BridgeNFTModal'

interface HandleNFTProps {
  isOwner: boolean
  canList: boolean
  price: number
  OGUNprice: number
  isAuction: boolean
  isBuyNow: boolean
  canComplete: boolean
  auctionIsOver: boolean
  countBids: number
  startingDate?: Date
  endingDate?: Date
  auctionId: string
  wasCancel?: boolean
  isPaymentOGUN?: boolean
  multipleEdition?: boolean
  // L2 Props
  tokenId?: string
  trackTitle?: string
  imageUrl?: string
  editionId?: string
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
  multipleEdition = false,
  tokenId,
  trackTitle,
  imageUrl,
  editionId,
}: HandleNFTProps) => {
  const router = useRouter()
  const [showRoyaltyModal, setShowRoyaltyModal] = useState(false)
  const [showBridgeModal, setShowBridgeModal] = useState(false)

  if (isOwner) {
    if (!canList) {
      return (
        <ListingAction href={`/get-verified`} action="GET VERIFIED">
          You must be verified in order to sell NFT’s.
        </ListingAction>
      )
    }
    if (isBuyNow || (isAuction && !auctionIsOver && countBids === 0)) {
      return (
        <ListedAction
          href={
            isBuyNow
              ? { pathname: `${router.pathname}/edit/buy-now`, query: { ...router.query, isPaymentOGUN } }
              : { pathname: `${router.pathname}/edit/auction`, query: { ...router.query, isPaymentOGUN } }
          }
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
      )
    }
    if (isAuction && (auctionIsOver || countBids > 0) && !wasCancel) {
      return (
        <AuctionDetails
          auctionIsOver={auctionIsOver}
          countBids={countBids}
          endingDate={endingDate}
          price={price}
          cancelHref={{ pathname: `${router.pathname}/cancel-auction`, query: router.query }}
          completeHref={{ pathname: `${router.pathname}/complete-auction`, query: router.query }}
          auctionId={auctionId}
          canComplete={canComplete}
        />
      )
    }
    return (
      <>
        <PlayerAwareBottomBar>
          <div className="flex flex-1 items-center gap-2 pl-4 text-sm font-bold">
            <CheckmarkFilled />
            You own this NFT
          </div>
          <div className="flex items-center gap-2">
            {/* L2 Buttons */}
            <button
              onClick={() => setShowRoyaltyModal(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-purple-500/20 border border-purple-500/30 text-purple-400 text-sm font-medium hover:bg-purple-500/30 transition-colors"
              title="Manage Royalty Splits"
            >
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">Royalties</span>
            </button>
            <button
              onClick={() => setShowBridgeModal(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 text-sm font-medium hover:bg-cyan-500/30 transition-colors"
              title="Bridge to Other Chains"
            >
              <ArrowRightLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Bridge</span>
            </button>
            <NextLink href={{ pathname: `${router.pathname}/list`, query: router.query }}>
              <Button variant="list-nft">
                <div className="px-4 font-bold">LIST NFT</div>
              </Button>
            </NextLink>
          </div>
        </PlayerAwareBottomBar>

        {/* L2 Modals */}
        <ManageRoyaltySplitterModal
          isOpen={showRoyaltyModal}
          onClose={() => setShowRoyaltyModal(false)}
          editionId={editionId || ''}
          trackTitle={trackTitle || 'Unknown Track'}
        />
        <BridgeNFTModal
          isOpen={showBridgeModal}
          onClose={() => setShowBridgeModal(false)}
          nft={{
            tokenId: tokenId || '0',
            title: trackTitle || 'Unknown Track',
            imageUrl,
            editionId,
          }}
        />
      </>
    )
    // not the owner
  } else {
    if (OGUNprice && price && isBuyNow) {
      return (
        <>
          <ListedAction
            href={{ pathname: `${router.pathname}/buy-now`, query: { ...router.query, isPaymentOGUN } }}
            price={price}
            OGUNprice={OGUNprice}
            isPaymentOGUN={isPaymentOGUN}
            action="COLLECT WITH POL"
            secondAction="COLLECT WITH OGUN"
            variant="buy-nft"
            startingDate={startingDate}
          />
        </>
      )
    }
    if (OGUNprice && isBuyNow) {
      return (
        <>
          <ListedAction
            href={{ pathname: `${router.pathname}/buy-now`, query: { ...router.query, isPaymentOGUN } }}
            price={price}
            OGUNprice={OGUNprice}
            isPaymentOGUN={isPaymentOGUN}
            action="COLLECT WITH OGUN"
            variant="buy-nft"
            startingDate={startingDate}
          />
        </>
      )
    }
    if (price && isBuyNow && !multipleEdition) {
      return (
        <ListedAction
          href={{ pathname: `${router.pathname}/buy-now`, query: router.query }}
          price={price}
          OGUNprice={OGUNprice}
          action="COLLECT TRACK"
          variant="buy-nft"
          startingDate={startingDate}
        />
      )
    }
    if (price && isAuction && !auctionIsOver) {
      return (
        <ListedAction
          href={{ pathname: `${router.pathname}/place-bid`, query: { ...router.query, isPaymentOGUN } }}
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
      )
    }
    if (canComplete && isAuction) {
      return (
        <ListedAction
          href={{ pathname: `${router.pathname}/complete-auction`, query: router.query }}
          price={price}
          OGUNprice={OGUNprice}
          action="COMPLETE"
          variant="buy-nft"
        />
      )
    }
  }
  return null
}

interface ListingActionProps {
  href: LinkProps['href']
  action: string
}

export const ListingAction = ({ href, action, children }: React.PropsWithChildren<ListingActionProps>) => {
  return (
    <PlayerAwareBottomBar>
      <div className="flex flex-1 items-center gap-2 pl-4 text-sm font-bold">{children}</div>
      <div className="flex flex-1 items-center justify-end">
        <NextLink href={href}>
          <Button variant="list-nft">
            <div className="px-4 font-bold">{action}</div>
          </Button>
        </NextLink>
      </div>
    </PlayerAwareBottomBar>
  )
}

interface ListedActionProps {
  isOwner?: boolean
  href?: LinkProps['href']
  price: number
  OGUNprice: number
  action: string
  secondAction?: string
  variant: ButtonVariant
  countBids?: number
  startingDate?: Date
  endingDate?: Date
  auctionId?: string
  isPaymentOGUN?: boolean
  onClick?: () => void
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
  const futureSale = startingDate && startingDate.getTime() > new Date().getTime()

  const { dispatchShowBidsHistory } = useModalDispatch()
  return (
    <PlayerAwareBottomBar>
      <div className="flex flex-1 flex-col">
        <div className="flex items-center gap-1 text-sm font-bold">
          {!!auctionId ? (
            <>
              {!!isPaymentOGUN ? (
                <Ogun value={OGUNprice ?? 0} variant="currency" />
              ) : (
                <Matic value={price} variant="currency" />
              )}
            </>
          ) : (
            <>
              {!!price && <Matic value={price} variant="currency" />}
              {!!OGUNprice && <Ogun value={OGUNprice ?? 0} variant="currency" />}
            </>
          )}
        </div>
      </div>
      {futureSale && startingDate && (
        <div className="flex flex-col items-center px-1 text-xs">
          <Timer date={startingDate} />
        </div>
      )}
      {endingDate && !futureSale && (
        <div className="flex flex-col items-center px-1 text-xs">
          {countBids != 0 && (
            <button className="font-bold text-blue-400" onClick={() => dispatchShowBidsHistory({ show: true, auctionId: auctionId || '' })}>
              [{countBids} bids]
            </button>
          )}
          <Timer date={endingDate} />
        </div>
      )}
      <div className="flex flex-1 items-center justify-end">
        {href &&
          (!!auctionId ? (
            <NextLink href={href} replace>
              <Button variant={variant}>{action}</Button>
            </NextLink>
          ) : (
            <>
              <NextLink href={href} replace>
                <Button variant={variant}>{action}</Button>
              </NextLink>
              {secondAction && (
                <NextLink href={href} replace>
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
  )
}

interface AuctionDetailsProps {
  cancelHref: LinkProps['href']
  auctionIsOver: boolean
  price: number
  countBids?: number
  endingDate?: Date
  completeHref: LinkProps['href']
  auctionId: string
  canComplete: boolean
  isPaymentOGUN?: boolean
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
    <div className="flex w-full items-center bg-black py-3 px-4 text-white">
      <div className="flex flex-1 flex-col">
        {isPaymentOGUN ? <Ogun value={price} variant="currency" /> : <Matic value={price} variant="currency" />}
      </div>
      <div className="text-center">
        {auctionIsOver && countBids === 0 && (
          <div className="flex flex-1 items-center justify-end">
            <NextLink href={cancelHref} replace>
              <Button variant="edit-listing">CANCEL AUCTION</Button>
            </NextLink>
          </div>
        )}
        {canComplete && countBids != 0 && (
          <ListedAction
            href={completeHref}
            isPaymentOGUN={isPaymentOGUN}
            price={price}
            OGUNprice={price}
            action="COMPLETE"
            variant="buy-nft"
            auctionId={auctionId}
          />
        )}
        {endingDate && (
          <div className="flex flex-col items-center text-xs ">
            <Timer date={endingDate} />
          </div>
        )}
      </div>
    </div>
  )
}

const Timer = ({ date }: { date: Date }) => {
  const router = useRouter()
  return (
    <TimeCounter
      date={date}
      onEndTimer={() => {
        if (date.getTime() > new Date().getTime()) {
          router.reload()
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
  )
}
