import { Button } from 'components/Buttons/Button'
import { Divider } from 'components/common'
import useBlockchain from 'hooks/useBlockchain'
import { useWalletContext } from 'hooks/useWalletContext'
import { Profile, TrackQuery, useListingItemLazyQuery, useUserByWalletLazyQuery } from 'lib/graphql'
import { HighestBid } from 'pages/tracks/[id]/complete-auction'
import { useEffect, useState } from 'react'
import { priceToShow } from 'utils/format'
import tw from 'tailwind-styled-components'
import { Timer } from './Timer'
import { ProfileWithAvatar } from 'components/ProfileWithAvatar'
import { useMe } from 'hooks/useMe'
import Link from 'next/link'
import { DisplayName } from 'components/DisplayName'
import { Avatar } from 'components/Avatar'

interface AuctionProps {
  track: TrackQuery['track']
}

export const Auction = (props: AuctionProps) => {
  const { track } = props

  const [highestBid, setHighestBid] = useState<HighestBid>({} as HighestBid)

  const me = useMe()

  const { getRoyalties, getHighestBid } = useBlockchain()
  const { account, web3 } = useWalletContext()

  const [fetchListingItem, { data: listingPayload, loading: loadingListingItem }] = useListingItemLazyQuery({
    fetchPolicy: 'network-only',
    nextFetchPolicy: 'network-only',
  })

  const [fetchHighestBidder, { data: highestBidderData }] = useUserByWalletLazyQuery({
    fetchPolicy: 'network-only',
    nextFetchPolicy: 'network-only',
  })

  const tokenId = track.nftData?.tokenId
  const contractAddress = track.nftData?.contract

  const startingTime = listingPayload?.listingItem?.startingTime || 0
  const endingTime = listingPayload?.listingItem?.endingTime || 0

  const startingDate = new Date(startingTime * 1000)
  const endingDate = new Date(endingTime * 1000)
  const futureSale = startingDate ? startingDate.getTime() > new Date().getTime() : false

  useEffect(() => {
    if (!tokenId || !contractAddress) return

    const variables = { input: { tokenId, contractAddress } }

    fetchListingItem({
      variables,
    })
  }, [track, tokenId, contractAddress, fetchListingItem])

  useEffect(() => {
    if (!web3 || !tokenId || !getHighestBid || highestBid.bidder != undefined) {
      return
    }

    const fetchHighestBid = async () => {
      const { _bid, _bidder } = await getHighestBid(web3, tokenId, { nft: track.nftData?.contract })
      setHighestBid({ bid: priceToShow(_bid || '0'), bidder: _bidder })
    }
    fetchHighestBid()
  }, [tokenId, web3, getHighestBid, highestBid.bidder, track.nftData])

  useEffect(() => {
    if (!highestBid.bidder) return

    fetchHighestBidder({
      variables: {
        walletAddress: highestBid.bidder,
      },
    })
  }, [highestBid.bidder, fetchHighestBidder])

  return (
    <>
      <Container>
        {/* <div className="mb-4 flex w-full items-start justify-between">
          <div className="flex items-center">
            <Avatar profile={me?.profile} pixels={40} className="mr-2" />

            <div className="">
              <Link href={`/profiles/${me?.profile.userHandle}`} passHref>
                <a className="flex items-center" aria-label={me?.profile.displayName}>
                  <span className="mr-[4px] text-sm text-neutral-400">Highest bid by</span>
                  <DisplayName
                    className="text-md"
                    name={me?.profile.displayName || ''}
                    verified={me?.profile.verified}
                    teamMember={me?.profile.teamMember}
                  />
                </a>
              </Link>
              <span className="text-sm text-neutral-400">0.900 OGUN</span>
            </div>
          </div>
          <span>
            <span className="mr-2 text-xl font-bold text-white">13</span>
            <span className="text-sm font-normal text-neutral-500">bids</span>
          </span>
        </div> */}

        <div className="mt-4 mb-2 flex w-full items-start justify-between">
          {futureSale && (
            <div>
              <Paragraph>Auction Starting in</Paragraph>
              <Timer date={startingDate} reloadOnEnd />
            </div>
          )}

          {endingDate && !futureSale && (
            <div>
              <Paragraph>Auction Ending in</Paragraph>
              <Timer date={endingDate} endedMessage="Auction Ended" />
            </div>
          )}

          <PriceContainer>
            <Button variant="rainbow">
              <span className="p-4">PLACE BID</span>
            </Button>
          </PriceContainer>
        </div>
      </Container>
      <Divider />
    </>
  )
}

const Container = tw.div`
  flex
  items-start
  flex-col
  w-full
`
const PriceContainer = tw.div`

`
const Paragraph = tw.p`
  text-lg
  text-neutral-400
  mb-2
`
