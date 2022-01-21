import { BuyNowItem, BuyNowItemModel } from '../models/BuyNowItem';
import { Context } from '../types/Context';
import { SellType } from '../types/NFTSoldNotificationMetadata';
import { ModelService } from './ModelService';

interface NewBuyNowItem {
  owner: string;
  nft: string;
  tokenId: number;
  pricePerItem: string;
  pricePerItemToShow: number;
  startingTime: number;
}

export class BuyNowService extends ModelService<typeof BuyNowItem> {
  constructor(context: Context) {
    super(context, BuyNowItemModel);
  }

  async createBuyNowItem(params: NewBuyNowItem): Promise<BuyNowItem> {
    const buyNowItem = new this.model(params);
    await buyNowItem.save();
    return buyNowItem;
  }

  async findBuyNowItem(tokenId: number): Promise<BuyNowItem> {
    const buyNowItem = await this.model.findOne({ tokenId, valid: true }).sort({ createdAt: -1 }).exec();
    return buyNowItem;
  }

  async updateBuyNowItem(tokenId: number, changes: Partial<BuyNowItem>): Promise<BuyNowItem> {
    const buyNowItem = await this.model
      .findOneAndUpdate({ tokenId, valid: true }, changes, { new: true })
      .sort({ createdAt: -1 })
      .exec();
    return buyNowItem;
  }

  async wasListedBefore(tokenId: number): Promise<boolean> {
    const buyNowItem = await this.model.findOne({ tokenId }).exec();
    return !!buyNowItem;
  }

  async setNotValid(tokenId: number): Promise<BuyNowItem> {
    const buyNowItem = await this.model.findOne({ tokenId }).sort({ createdAt: -1 }).exec();
    buyNowItem.valid = false;
    buyNowItem.save();
    return buyNowItem;
  }

  async finishListing(tokenId: string, sellerWallet: string, buyerWaller: string, price: number): Promise<void> {
    const [sellerUser, buyerUser, track] = await Promise.all([
      this.context.userService.getUserByWallet(sellerWallet),
      this.context.userService.getUserByWallet(buyerWaller),
      this.context.trackService.getTrackByTokenId(parseInt(tokenId)),
    ]);
    if (!sellerUser) {
      await Promise.all([
        this.context.buyNowItemService.setNotValid(parseInt(tokenId)),
        this.context.trackService.setPendingNone(parseInt(tokenId)),
      ]);
      return;
    }
    const profileId = buyerUser?.profileId || '';
    await Promise.all([
      this.context.trackService.updateTrack(track._id, { profileId }),
      this.context.notificationService.notifyNFTSold({
        sellerProfileId: sellerUser.profileId,
        buyerProfileId: profileId,
        price,
        trackId: track._id,
        trackName: track.title,
        artist: track.artist,
        artworkUrl: track.artworkUrl,
        sellType: SellType.BuyNow,
      }),
    ]);
    await Promise.all([
      this.context.buyNowItemService.setNotValid(parseInt(tokenId)),
      this.context.trackService.setPendingNone(parseInt(tokenId)),
    ]);
  }
}
