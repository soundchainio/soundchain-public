import { ObjectId } from 'mongodb';
import { Bid, BidModel } from '../models/Bid';
import { Profile } from '../models/Profile';
import { User } from '../models/User';
import { Context } from '../types/Context';
import { ModelService } from './ModelService';

interface BidInterface {
  nft: string;
  tokenId: number;
  bidder: string;
  amount: number;
  auctionId: string;
  profileId: string;
  userId: string;
}

export interface BidsWithInfo extends Bid {
  user: User;
  profile: Profile;
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

  async getBidsWithInfo(auctionId: string): Promise<BidsWithInfo[]> {
    const bids = await this.model.aggregate<BidsWithInfo>([
      {
        $match: {
          auctionId: new ObjectId(auctionId),
        },
      },
      {
        $lookup: {
          from: 'profiles',
          localField: 'profileId',
          foreignField: '_id',
          as: 'profile',
        },
      },
      {
        $unwind: {
          path: '$profile',
        },
      },
    ]);
    return bids;
  }
}
