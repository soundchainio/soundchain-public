import { TrackQuery, useAuctionItemQuery, useBidsWithInfoQuery } from 'lib/graphql'
import { Matic as MaticIcon } from 'icons/Matic'
import tw from 'tailwind-styled-components'
import { ProfileWithAvatar } from 'components/ProfileWithAvatar'
import { Accordion } from 'components/common'

interface BidHistoryProps {
  track: TrackQuery['track']
}

export const BidHistory = (props: BidHistoryProps) => {
  const { track } = props

  const { data: { auctionItem } = {} } = useAuctionItemQuery({
    variables: { tokenId: track.nftData?.tokenId as number },
    skip: !track.nftData?.tokenId,
  })

  const auctionId = auctionItem?.auctionItem?.id

  const { data, loading } = useBidsWithInfoQuery({
    variables: {
      auctionId: auctionId || '',
    },
    pollInterval: 30000, // 30s instead of 10s for battery efficiency
    skip: !auctionId,
  })

  if (!data) return null

  if (!data || (data?.bidsWithInfo?.bids && data?.bidsWithInfo?.bids?.length <= 0) || loading) return null

  return (
    <Accordion title="Bids">
      <TitleContainer>
        <H3>Bidder</H3>
        <H3>Amount</H3>
      </TitleContainer>
      {data &&
        data?.bidsWithInfo?.bids?.map((bid, index) => (
          <div key={index} className="mb-6 flex items-center justify-between">
            <ProfileWithAvatar profile={bid.profile} />
            <div className="flex items-center">
              <BidAmount>{bid.amountToShow}</BidAmount>
              <MaticIcon className="ml-[5px]" width={15} height={15} />
            </div>
          </div>
        ))}
    </Accordion>
  )
}

const TitleContainer = tw.div`
  flex
  items-center
  justify-between
`

const H3 = tw.h3`
  text-white
  font-bold
  text-lg
  mb-6
`
const BidAmount = tw.span`
  text-neutral-400
  text-sm
  font-semibold
  mt-[2px]
`
