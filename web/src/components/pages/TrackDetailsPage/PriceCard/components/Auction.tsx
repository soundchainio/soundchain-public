import { useEffect, useState } from 'react'

import { Avatar } from 'components/Avatar'
import { Divider } from 'components/common'
import { Button } from 'components/common/Buttons/Button'
import { DisplayName } from 'components/DisplayName'
import useBlockchain from 'hooks/useBlockchain'
import useBlockchainV2 from 'hooks/useBlockchainV2'
import useMetaMask from 'hooks/useMetaMask'
import { useTokenOwner } from 'hooks/useTokenOwner'
import { useWalletContext } from 'hooks/useWalletContext'
import { Matic as MaticIcon } from 'icons/Matic'
import {
  PendingRequest,
  TrackQuery,
  useAuctionItemQuery,
  useCountBidsLazyQuery,
  useUserByWalletLazyQuery,
} from 'lib/graphql'
import Link from 'next/link'
import { type HighestBid } from 'pages/tracks/[id]/complete-auction' // Changed to type-only import
import tw from 'tailwind-styled-components'
import { priceToShow } from 'utils/format'
import { compareWallets } from 'utils/Wallet'

import { Timer } from '../../../../common/Timer/Timer'

interface AuctionProps {
  track: TrackQuery['track']
}

export const Auction = (props: AuctionProps) => {
  const { track } = props

  const [highestBid, setHighestBid] = useState<HighestBid>({} as HighestBid)
  const [royalties, setRoyalties] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const { getRoyalties, getHighestBid } = useBlockchain()
  const { account, web3 } = useWalletContext()
  const { getEditionRoyalties } = useBlockchainV2()
  const { connect } = useMetaMask()

  const [fetchHighestBidder, { data: highestBidderData }] = useUserByWalletLazyQuery({
    fetchPolicy: 'network-only',
    nextFetchPolicy: 'network-only',
  })

  const [fetchCountBids, { data: countBids }] = useCountBidsLazyQuery({
    fetchPolicy: 'network-only',
    nextFetchPolicy: 'network-only',
  })

  const { data: { auctionItem } = {} } = useAuctionItemQuery({
    variables: { tokenId: track.nftData?.tokenId as number },
    skip: !track?.nftData?.tokenId,
  })

  const tokenId = track.nftData?.tokenId

  const { isOwner } = useTokenOwner(tokenId, track.nftData?.contract)

  const isProcessing = track.nftData?.pendingRequest != PendingRequest.None

  const startingTime = auctionItem?.auctionItem?.startingTime || 0
  const endingTime = auctionItem?.auctionItem?.endingTime || 0
  const isAuctionOver = (auctionItem?.auctionItem?.endingTime || 0) < Math.floor(Date.now() / 1000)
  const startPrice = auctionItem?.auctionItem?.reservePriceToShow
  const isAuction = Boolean(auctionItem?.auctionItem)

  const startingDate = new Date(startingTime * 1000)
  const endingDate = new Date(endingTime * 1000)
  const isFutureSale = startingDate ? startingDate.getTime() > new Date().getTime() : false
  const bidCount = countBids?.countBids.numberOfBids ?? 0
  const canEditAuction = isOwner && !isAuctionOver && bidCount === 0
  const canCancel = isOwner && bidCount === 0 && isAuction

  const canHighestBidderComplete = isAuctionOver && compareWallets(highestBid.bidder, account)
  const canHighestOwnerComplete = isAuctionOver && compareWallets(account, auctionItem?.auctionItem?.owner)
  const canComplete = (canHighestBidderComplete || canHighestOwnerComplete) && bidCount > 0

  useEffect(() => {
    if (!web3 || !tokenId || !getHighestBid || highestBid.bidder != undefined || !track.trackEdition) {
      return
    }

    const fetchData = async () => {
      try {
        setIsLoading(true)
        const { _bid, _bidder } = await getHighestBid(web3, tokenId, { nft: track.nftData?.contract })
        setHighestBid({ bid: priceToShow(_bid || '0'), bidder: _bidder })

        const royaltiesFromBlockchain = await getEditionRoyalties(web3, track?.trackEdition?.editionId || 0)

        setRoyalties(royaltiesFromBlockchain)

        fetchCountBids({ variables: { tokenId } })
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [
    tokenId,
    web3,
    getHighestBid,
    highestBid.bidder,
    track.nftData,
    fetchCountBids,
    getRoyalties,
    track,
    getEditionRoyalties,
  ])

  useEffect(() => {
    if (!highestBid.bidder) return

    fetchHighestBidder({
      variables: {
        walletAddress: highestBid.bidder,
      },
    })
  }, [highestBid.bidder, fetchHighestBidder])

  if (!auctionItem) return null

  if (!account && !isLoading) {
    const MetaMaskLink = () => (
      <strong onClick={connect} className="mx-[2px] hover:cursor-pointer hover:text-white">
        MetaMask
      </strong>
    )

    const SoundchainLoginLink = () => (
      <Link href="/login" className="mx-[2px] hover:text-white" passHref>
        <strong>Soundchain</strong>
      </Link>
    )

    return (
      <>
        <span className="my-6 text-lg text-neutral-400">
          Create a <SoundchainLoginLink /> account or connect your <MetaMaskLink /> wallet.
        </span>
        <Divider />
      </>
    )
  }

  if (!isAuction) return null

  return (
    <>
      <Container>
        <BidsContainer>
          {highestBidderData?.getUserByWallet && (
            <AvatarContainer>
              <Avatar profile={highestBidderData.getUserByWallet.profile} pixels={40} className="mr-2" />

              <div>
                <Link
                  href={`/profiles/${highestBidderData.getUserByWallet.profile.userHandle}`}
                  passHref
                  className="flex items-center"
                  aria-label={highestBidderData.getUserByWallet.profile.displayName}
                >
                  <HighestBid>Highest bid by</HighestBid>
                  <DisplayName
                    className="text-md"
                    name={highestBidderData.getUserByWallet.profile.displayName || ''}
                    verified={highestBidderData.getUserByWallet.profile.verified}
                    teamMember={highestBidderData.getUserByWallet.profile.teamMember}
                  />
                </Link>
                <div className="flex items-center">
                  <BidAmount className="text-sm text-neutral-400">{highestBid.bid}</BidAmount>
                  <MaticIcon className="ml-[5px]" width={15} height={15} />
                </div>
              </div>
            </AvatarContainer>
          )}

          {!highestBidderData?.getUserByWallet && <Paragraph>No bidder</Paragraph>}

          {!highestBidderData?.getUserByWallet && (
            <span>
              <NumberOfBids>{bidCount}</NumberOfBids>
              <BidText>bids</BidText>
            </span>
          )}
        </BidsContainer>

        <div className="mt-4 mb-2 flex  w-full flex-col items-center gap-2">
          {isFutureSale && !isAuctionOver && (
            <>
              <Title>Auction Starting in</Title>
              <Timer date={startingDate} reloadOnEnd />
            </>
          )}

          {endingDate && !isFutureSale && !isAuctionOver && (
            <>
              <Title>Auction Ending in</Title>
              <Timer date={endingDate} endedMessage="Auction Ended" />
            </>
          )}

          {!isOwner && !isAuctionOver && !isFutureSale && (
            <>
              <Link href={`/tracks/${track.id}/place-bid?isPaymentOGUN=false`} className="mt-2 w-full" passHref>
                <Button variant="rainbow" loading={isProcessing}>
                  <span className="p-4">PLACE BID</span>
                </Button>
              </Link>
              <SmallParagraph>it may take several seconds for prices to update</SmallParagraph>
            </>
          )}

          {canEditAuction && !isAuctionOver && (
            <Link href={`/tracks/${track.id}/edit/auction`} className="mt-2 w-full" passHref>
              <Button variant="rainbow" loading={isProcessing}>
                <span className="p-4">EDIT AUCTION</span>
              </Button>
            </Link>
          )}

          {canComplete && isAuctionOver && (
            <Link href={`/tracks/${track.id}/complete-auction`} className="mt-2 w-full" passHref>
              <Button variant="rainbow" loading={isProcessing}>
                <span className="p-4">COMPLETE AUCTION</span>
              </Button>
            </Link>
          )}

          {canCancel && (
            <Link href={`/tracks/${track.id}/cancel-auction`} className="mt-2 w-full" passHref>
              <Button variant="rainbow" loading={isProcessing}>
                <span className="p-4">CANCEL AUCTION</span>
              </Button>
            </Link>
          )}
        </div>

        <div className="mt-6 w-full">
          <Divider />
          {!isAuctionOver && (
            <AuctionPricingContainer>
              <PriceContainer>
                <span className="flex items-center">
                  <Price>{startPrice}</Price>
                  <MaticIcon className="ml-[5px] mt-[2px]" width={15} height={15} />
                </span>
                <PriceTitle>Starting Price</PriceTitle>
              </PriceContainer>

              <PriceContainer>
                <span className="flex items-center">
                  <Price>{highestBid.bid}</Price>
                  <MaticIcon className="ml-[5px] mt-[2px]" width={15} height={15} />
                </span>
                <PriceTitle>{isAuctionOver ? 'Final Price' : 'Current Price'}</PriceTitle>
              </PriceContainer>

              <PriceContainer>
                <Price>
                  {royalties}
                  <span className="ml-[4px] text-sm font-bold text-neutral-400">%</span>
                </Price>
                <PriceTitle>Royalties</PriceTitle>
              </PriceContainer>
            </AuctionPricingContainer>
          )}
          <Divider />
        </div>
      </Container>
    </>
  )
}

const Container = tw.div`
  flex
  items-start
  flex-col
  w-full
`

const Paragraph = tw.p`
  text-lg
  text-neutral-400
`

const SmallParagraph = tw.p`
  text-sm
  text-neutral-500
  mt-2
`

const Title = tw.h3`
  text-lg
  text-slate-50
`

const BidsContainer = tw.div`
  mb-4 
  flex 
  w-full 
  items-start 
  justify-between
`
const NumberOfBids = tw.span`
  mr-2 
  text-xl 
  font-bold 
  text-white
`
const BidText = tw.span`
  text-sm 
  font-normal 
  text-neutral-500
`
const AvatarContainer = tw.div`
  flex 
  items-center
`

const BidAmount = tw.span`
  text-sm 
  text-neutral-400
`
const HighestBid = tw.span`
  mr-[4px] 
  text-sm 
  text-neutral-400
`

const AuctionPricingContainer = tw.div`
  my-2 
  flex 
  flex-wrap 
  items-center 
  justify-between 

  md:gap-6
`

const PriceContainer = tw.div`
  flex 
  items-center
  gap-2
  text-white

  md:mt-4
  md:mb-2
`

const PriceTitle = tw.span`
  text-xs 
  text-neutral-500
  uppercase
  mt-[7px]
  tracking-wide
`
const Price = tw.span`
  mt-[4px] 
  text-[22px] 
  font-bold
`
