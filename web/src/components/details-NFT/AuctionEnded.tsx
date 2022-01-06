import MaxGasFee from 'components/MaxGasFee';
import { SoundchainFee } from 'components/SoundchainFee';

import { HighestBid } from 'pages/tracks/[id]/complete-auction';

interface AuctionEndedProps {
  highestBid: HighestBid;
}

export const AuctionEnded = ({ highestBid }: AuctionEndedProps) => {
  const winningBid = (parseFloat(highestBid.bid) / 1e18).toFixed(6);

  return (
    <div className="mb-16 flex flex-col gap-4 px-4 py-6 bg-gray-20">
      <SoundchainFee price={winningBid} />
      <MaxGasFee />
    </div>
  );
};
