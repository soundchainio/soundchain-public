import { CheckmarkFilled } from 'icons/CheckmarkFilled';
import { Matic } from 'icons/Matic';
import { HighestBid } from 'pages/tracks/[id]/complete-auction';

interface AuctionEndedProps {
  highestBid: HighestBid;
  isOwner: boolean;
}

export const AuctionEnded = ({ highestBid, isOwner }: AuctionEndedProps) => {
  const winningBid = (parseFloat(highestBid.bid) / 1e18).toFixed(6);

  return (
    <div>
      <div className="flex flex-col m-8 gap-2">
        <div className="flex gap-1 justify-center">
          <CheckmarkFilled />
          <p className="text-green-500 text-xs font-bold uppercase">
            congrats, you {isOwner ? 'sold' : 'won'} this NFT!
          </p>
        </div>
      </div>
      <div className="flex p-5 text-gray-80">
        <p className="flex items-center flex-shrink-0 justify-start font-bold text-xs md-text-sm uppercase">
          winning bid
        </p>
        <p className="flex items-center justify-end w-full uppercase">
          <span className="my-auto">
            <Matic />
          </span>
          <span className="mx-1 text-white font-bold text-md leading-tight">{winningBid}</span>
          <span className="items-end font-bold text-xs leading-tight">matic</span>
        </p>
      </div>
      <div className="flex p-5 text-gray-80">
        <p className="flex items-center flex-shrink-0 justify-start font-bold text-xs md-text-sm uppercase">
          time reaming
        </p>
        <p className="flex items-center w-full justify-end">
          <span className="mx-1 text-red-500 font-bold text-xs leading-tight uppercase">auction ended</span>
        </p>
      </div>
      <div className="flex p-5 bg-gray-15 text-gray-80">
        <p className="flex items-center flex-shrink-0 justify-start font-bold text-xs md-text-sm uppercase">
          SoundChain Fee (2.5%)
        </p>
        <p className="flex items-center justify-end w-full uppercase gap-1">
          <span className="my-auto">
            <Matic />
          </span>
          <span className="text-white font-bold text-md leading-tight">
            {(parseFloat(winningBid) * 0.025).toFixed(6)}
          </span>
          <span className="items-end font-bold text-xs leading-tight">matic</span>
        </p>
      </div>
    </div>
  );
};
