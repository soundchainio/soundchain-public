import { AuctionItem, AuctionItemModel } from '../models/AuctionItem';
import { Context } from '../types/Context';
import { SellType } from '../types/NFTSoldNotificationMetadata';
import { ModelService } from './ModelService';

interface NewAuctionItem {
  owner: string;
  nft: string;
  tokenId: number;
  reservePrice: string;
  startingTime: number;
  endingTime: number;
}

interface CountBids {
  numberOfBids: number;
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

  async finishListing(tokenId: string, sellerWallet: string, buyerWaller: string, price: string): Promise<void> {
    this.context.auctionItemService.setNotValid(parseInt(tokenId));
    this.context.trackService.setPendingNone(parseInt(tokenId));

    const [sellerUser, buyerUser, track] = await Promise.all([
      this.context.userService.getUserByWallet(sellerWallet),
      this.context.userService.getUserByWallet(buyerWaller),
      this.context.trackService.getTrackByTokenId(parseInt(tokenId)),
    ]);
    this.context.trackService.updateTrack(track._id, { profileId: buyerUser.profileId });
    this.context.notificationService.notifyNFTSold({
      sellerProfileId: sellerUser.profileId,
      buyerProfileId: buyerUser.profileId,
      price,
      trackId: track._id,
      trackName: track.title,
      artist: track.artist,
      artworkUrl: track.artworkUrl,
      sellType: SellType.Auction,
    });
  }

  async countBids(tokenId: number): Promise<CountBids> {
    const count = await this.model.aggregate<CountBids>([
      {
        $match: {
          tokenId,
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
    return count[0];
  }
}
