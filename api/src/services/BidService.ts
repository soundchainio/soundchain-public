import { Bid, BidModel } from '../models/Bid';
import { Context } from '../types/Context';
import { ModelService } from './ModelService';

interface BidInterface {
  nft: string;
  tokenId: number;
  bidder: string;
  amount: number;
  auctionId: string;
}

export class BidService extends ModelService<typeof Bid> {
  constructor(context: Context) {
    super(context, BidModel);
  }

  async createBid(params: BidInterface): Promise<Bid> {
    const Bid = new this.model(params);
    await Bid.save();
    return Bid;
  }
}
