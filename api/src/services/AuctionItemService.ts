// @ts-nocheck
import { AuctionItem, AuctionItemModel } from '../models/AuctionItem';
import { Bid, BidModel } from '../models/Bid';
import { TrackModel } from '../models/Track';
import { Context } from '../types/Context';
import { SellType } from '../types/NFTSoldNotificationMetadata';
import { NotificationType } from '../types/NotificationType';
import { getNow } from '../utils/Time';
import { ModelService } from './ModelService';

interface NewAuctionItem {
  owner: string;
  nft: string;
  tokenId: number;
  reservePrice: string;
  reservePriceToShow: number;
  startingTime: number;
  endingTime: number;
  contract: string;
  trackEditionId?: string;
  trackId?: string;
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
            $max: '$amountToShow',
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

  async finishListing(
    tokenId: string,
    sellerWallet: string,
    buyerWaller: string,
    price: number,
    contractAddress: string,
  ): Promise<void> {
    const [sellerUser, buyerUser, track, auctionItem] = await Promise.all([
      this.context.userService.getUserByWallet(sellerWallet),
      this.context.userService.getUserByWallet(buyerWaller),
      this.context.trackService.getTrackByTokenId(parseInt(tokenId), contractAddress),
      this.context.auctionItemService.findAuctionItem(parseInt(tokenId)),
    ]);
    if (!sellerUser || !buyerUser) {
      return;
    }
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
        isPaymentOgun: auctionItem.isPaymentOGUN,
      }),
    ]);
    await Promise.all([
      this.context.auctionItemService.setNotValid(parseInt(tokenId)),
      this.context.trackService.setPendingNone(parseInt(tokenId), contractAddress),
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
    const now = getNow();
    const [auctionsEnded, auctionsEndingInOneHour] = await Promise.all([
      this.pendingNotificationsEndedAuctions(now),
      this.fetchAuctionsEndingInOneHour(now),
    ]);
    await Promise.all([
      ...auctionsEnded.map(auction => this.notifyAuctionIsOver(auction)),
      ...auctionsEndingInOneHour.map(({ bids, _id }) => {
        const bidsWithoutDuplicate = bids.filter(
          (v, i, a) => a.findIndex(t => t.profileId.toString() === v.profileId.toString()) === i,
        );
        bidsWithoutDuplicate.map(bid =>
          Promise.all([this.notifyAuctionIsEnding(bid, _id), this.setBidIsNotified(bid._id)]),
        );
      }),
    ]);
  }

  private async setBidIsNotified(bidId: string) {
    await BidModel.findOneAndUpdate({ _id: bidId }, { notifiedEndingInOneHour: true });
  }

  private async notifyAuctionIsOver({
    _id,
    highestBid,
    highestBidToShow,
    reservePriceToShow,
    tokenId,
    owner,
    nft,
  }: AuctionItem): Promise<void> {
    const [highestBidModel, track] = await Promise.all([
      BidModel.findOne({ auctionId: _id, amount: highestBid }),
      this.context.trackService.getTrackByTokenId(tokenId, nft),
    ]);
    const promises = [this.context.userService.getUserByWallet(owner)];
    if (highestBidModel?.bidder) {
      promises.push(this.context.userService.getUserByWallet(highestBidModel.bidder));
    }
    const [sellerUser, buyerUser] = await Promise.all(promises);
    await this.context.notificationService.notifyAuctionIsOver({
      track,
      price: highestBidToShow || reservePriceToShow,
      sellerProfileId: sellerUser?.profileId,
      buyerProfileId: buyerUser?.profileId,
      auctionId: _id,
    });
  }

  private async notifyAuctionIsEnding({ tokenId, bidder, amountToShow, nft }: Bid, auctionId: string): Promise<void> {
    const [user, track] = await Promise.all([
      this.context.userService.getUserByWallet(bidder),
      this.context.trackService.getTrackByTokenId(tokenId, nft),
    ]);
    await this.context.notificationService.notifyAuctionIsEnding({
      track,
      profileId: user.profileId,
      price: amountToShow,
      auctionId,
    });
  }

  private async pendingNotificationsEndedAuctions(now: number): Promise<AuctionItem[]> {
    return await TrackModel.aggregate<AuctionItem>([
      {
        $lookup: {
          from: 'auctionitems',
          localField: 'nftData.tokenId',
          foreignField: 'tokenId',
          as: 'auctionitem',
        },
      },
      {
        $addFields: {
          auctionitem: {
            $filter: {
              input: '$auctionitem',
              as: 'item',
              cond: {
                $and: [
                  {
                    $eq: ['$$item.valid', true],
                  },
                  {
                    $lte: ['$$item.endingTime', now],
                  },
                ],
              },
            },
          },
        },
      },
      {
        $unwind: {
          path: '$auctionitem',
        },
      },
      {
        $lookup: {
          from: 'bids',
          localField: 'auctionitem._id',
          foreignField: 'auctionId',
          as: 'bids',
        },
      },
      {
        $addFields: {
          bidCount: {
            $size: '$bids',
          },
        },
      },
      {
        $lookup: {
          from: 'notifications',
          localField: 'auctionitem._id',
          foreignField: 'metadata.auctionId',
          as: 'notification',
        },
      },
      {
        $addFields: {
          notification: {
            $filter: {
              input: '$notification',
              as: 'item',
              cond: {
                $and: [
                  {
                    $eq: ['$$item.type', NotificationType.AuctionEnded],
                  },
                  {
                    $eq: ['$$item.metadata.auctionId', '$auctionitem._id'],
                  },
                ],
              },
            },
          },
        },
      },
      {
        $addFields: {
          notificationCount: {
            $size: '$notification',
          },
        },
      },
      {
        $match: {
          notificationCount: 0,
        },
      },
      {
        $replaceRoot: {
          newRoot: '$auctionitem',
        },
      },
    ]);
  }

  private async fetchAuctionsEndingInOneHour(now: number): Promise<AuctionWithBids[]> {
    const oneHourInSecs = 60 * 60;
    const nowInSecs = now / 1000;

    return await this.model.aggregate<AuctionWithBids>([
      {
        $addFields: {
          endingTimeInOneHour: {
            $gte: [
              '$endingTime',
              {
                $subtract: [nowInSecs, oneHourInSecs],
              },
            ],
          },
        },
      },
      {
        $match: {
          valid: true,
          endingTimeInOneHour: true,
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
        $addFields: {
          bidCount: {
            $size: '$bids',
          },
        },
      },
      {
        $match: {
          bidCount: {
            $gt: 0,
          },
        },
      },
      {
        $lookup: {
          from: 'notifications',
          localField: '_id',
          foreignField: 'metadata.auctionId',
          as: 'notification',
        },
      },
      {
        $addFields: {
          notification: {
            $filter: {
              input: '$notification',
              as: 'item',
              cond: {
                $and: [
                  {
                    $eq: ['$$item.type', NotificationType.AuctionIsEnding],
                  },
                  {
                    $eq: ['$$item.metadata.auctionId', '$_id'],
                  },
                ],
              },
            },
          },
        },
      },
      {
        $addFields: {
          notificationCount: {
            $size: '$notification',
          },
        },
      },
      {
        $match: {
          notificationCount: 0,
        },
      },
    ]);
  }
}
