import { AuctionItem, AuctionItemModel } from '../models/AuctionItem';
import { Bid, BidModel } from '../models/Bid';
import { Context } from '../types/Context';
import { SellType } from '../types/NFTSoldNotificationMetadata';
import { ModelService } from './ModelService';

interface NewAuctionItem {
  owner: string;
  nft: string;
  tokenId: number;
  reservePrice: number;
  startingTime: number;
  endingTime: number;
}

interface CountBids {
  numberOfBids: number;
}

interface AuctionWithBids extends AuctionItem {
  bids: Bid[];
}

export class AuctionItemService extends ModelService<typeof AuctionItem> {
  constructor(context: Context) {
    super(context, AuctionItemModel);
  }

  async createAuctionItem(params: NewAuctionItem): Promise<AuctionItem> {
    const AuctionItem = new this.model(params);
    await AuctionItem.save();
    return AuctionItem;
  }

  async findAuctionItem(tokenId: number): Promise<AuctionItem> {
    const AuctionItem = await this.model.findOne({ tokenId, valid: true }).sort({ createdAt: -1 }).exec();
    return AuctionItem;
  }

  async updateAuctionItem(tokenId: number, changes: Partial<AuctionItem>): Promise<AuctionItem> {
    const AuctionItem = await this.model
      .findOneAndUpdate({ tokenId, valid: true }, changes, { new: true })
      .sort({ createdAt: -1 })
      .exec();
    return AuctionItem;
  }

  async getHighestBid(auctionId: string): Promise<number | undefined> {
    const res = await BidModel.aggregate([
      {
        $match: {
          auctionId,
        },
      },
      {
        $group: {
          _id: null,
          highestBid: {
            $max: '$amount',
          },
        },
      },
    ]);
    return res.length ? res[0].highestBid : undefined;
  }

  async wasListedBefore(tokenId: number): Promise<boolean> {
    const AuctionItem = await this.model.findOne({ tokenId }).exec();
    return !!AuctionItem;
  }

  async setNotValid(tokenId: number): Promise<AuctionItem> {
    const AuctionItem = await this.model.findOne({ tokenId }).sort({ createdAt: -1 }).exec();
    AuctionItem.valid = false;
    AuctionItem.save();
    return AuctionItem;
  }

  async finishListing(tokenId: string, sellerWallet: string, buyerWaller: string, price: number): Promise<void> {
    const [sellerUser, buyerUser, track] = await Promise.all([
      this.context.userService.getUserByWallet(sellerWallet),
      this.context.userService.getUserByWallet(buyerWaller),
      this.context.trackService.getTrackByTokenId(parseInt(tokenId)),
    ]);
    await Promise.all([
      this.context.trackService.updateTrack(track._id, { profileId: buyerUser.profileId }),
      this.context.notificationService.notifyNFTSold({
        sellerProfileId: sellerUser.profileId,
        buyerProfileId: buyerUser.profileId,
        price,
        trackId: track._id,
        trackName: track.title,
        artist: track.artist,
        artworkUrl: track.artworkUrl,
        sellType: SellType.Auction,
      }),
    ]);
    await Promise.all([
      this.context.auctionItemService.setNotValid(parseInt(tokenId)),
      this.context.trackService.setPendingNone(parseInt(tokenId)),
    ]);
  }

  async countBids(tokenId: number): Promise<CountBids> {
    const count = await this.model.aggregate<CountBids>([
      {
        $match: {
          tokenId,
          valid: true,
        },
      },
      {
        $lookup: {
          from: 'bids',
          localField: '_id',
          foreignField: 'auctionId',
          as: 'bids',
        },
      },
      {
        $project: {
          numberOfBids: {
            $size: '$bids',
          },
        },
      },
    ]);
    return count.length ? count[0] : { numberOfBids: 0 };
  }

  async haveBided(auctionId: string, bidder: string): Promise<boolean> {
    const bid = await BidModel.findOne({ auctionId, bidder });
    return !!bid;
  }

  async processAuctions(): Promise<void> {
    const now = Math.floor(new Date().getTime() / 1000);
    const auctionsEnded = await this.model.find({ valid: true, endingTime: { $lte: now } });
    const auctionsEndingInOneHour = await this.fetchAuctionsEndingInOneHour(now);
    await Promise.all(
      auctionsEndingInOneHour.map(({ bids }) => {
        bids.map(async bid => {
          await Promise.all([this.notifyAuctionIsEnding(bid), this.setBidIsNotified(bid._id)]);
        });
      }),
    );

    await Promise.all(auctionsEnded.map(auction => this.notifyWinner(auction)));
    await this.model.updateMany({ valid: true, endingTime: { $lte: now } }, { $set: { valid: false } });
  }

  private async setBidIsNotified(bidId: string) {
    await BidModel.findOneAndUpdate({ _id: bidId }, { notifiedEndingInOneHour: true });
  }

  private async notifyWinner({ _id, highestBid, tokenId }: AuctionItem): Promise<void> {
    const [highestBidModel, track] = await Promise.all([
      BidModel.findOne({ auctionId: _id, amount: highestBid }),
      this.context.trackService.getTrackByTokenId(tokenId),
    ]);
    const buyerProfile = await this.context.userService.getUserByWallet(highestBidModel.bidder);
    await this.context.notificationService.notifyWonAuction(
      track._id,
      highestBid,
      track.artist,
      track.artworkUrl,
      track.title,
      buyerProfile.profileId,
    );
  }

  private async notifyAuctionIsEnding({ tokenId, bidder }: Bid): Promise<void> {
    const [user, track] = await Promise.all([
      this.context.userService.getUserByWallet(bidder),
      this.context.trackService.getTrackByTokenId(tokenId),
    ]);
    await this.context.notificationService.notifyAuctionIsEnding(track._id, track.title, user.profileId);
  }

  private async fetchAuctionsEndingInOneHour(now: number): Promise<AuctionWithBids[]> {
    const oneHourInSecs = 60 * 60;

    return await this.model.aggregate<AuctionWithBids>([
      {
        $match: {
          $expr: {
            $and: [
              {
                valid: true,
              },
              {
                $gte: [
                  '$endingTime',
                  {
                    $subtract: [now, oneHourInSecs],
                  },
                ],
              },
              {
                $lte: ['$endingTime', now],
              },
            ],
          },
        },
      },
      {
        $lookup: {
          from: 'bids',
          as: 'bids',
          let: {
            auctionId: '$_id',
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    {
                      $eq: ['$auctionId', '$$auctionId'],
                    },
                    {
                      $eq: ['$notifiedEndingInOneHour', false],
                    },
                  ],
                },
              },
            },
          ],
        },
      },
    ]);
  }
}
