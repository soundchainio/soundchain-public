import MaxGasFee from 'components/MaxGasFee'
import { SoundchainFee } from 'components/SoundchainFee'

import { HighestBid } from 'pages/tracks/[id]/complete-auction'

interface AuctionEndedProps {
  highestBid: HighestBid
}

export const AuctionEnded = ({ highestBid }: AuctionEndedProps) => (
  <div className="mb-16 flex flex-col gap-4 bg-gray-20 px-4 py-6">
    <SoundchainFee price={highestBid.bid} isPaymentOGUN={false} />
    <MaxGasFee />
  </div>
)
