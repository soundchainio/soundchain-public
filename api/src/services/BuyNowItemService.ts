import { BuyNowItem, BuyNowItemModel } from '../models/BuyNowItem';
import { Context } from '../types/Context';
import { SellType } from '../types/NFTSoldNotificationMetadata';
import { ModelService } from './ModelService';
import mongoose from 'mongoose';

interface NewBuyNowItem {
  owner: string;
  nft: string;
  tokenId: number;
  selectedCurrency?: string;
  pricePerItem: string;
  pricePerItemToShow: number;
  OGUNPricePerItem: string;
  OGUNPricePerItemToShow: number;
  acceptsMATIC: boolean;
  acceptsOGUN: boolean;
  startingTime: number;
  contract: string;
  trackEditionId?: string;
  trackId?: string;
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

  async findBuyNowItem(tokenId: number, contractAddress: string): Promise<BuyNowItem> {
    const buyNowItem = await this.model
      .findOne({ tokenId, nft: contractAddress, valid: true })
      .sort({ createdAt: -1 })
      .exec();
    return buyNowItem;
  }

  async updateBuyNowItem(
    tokenId: number,
    changes: Partial<BuyNowItem>,
    contractAddress: string,
    marketplaceAddress: string,
  ): Promise<BuyNowItem> {
    const buyNowItem = await this.model
      .findOneAndUpdate({ tokenId, nft: contractAddress, contract: marketplaceAddress, valid: true }, changes, {
        new: true,
      })
      .sort({ createdAt: -1 })
      .exec();
    return buyNowItem;
  }

  async wasListedBefore(tokenId: number, contractAddress: string): Promise<boolean> {
    const buyNowItem = await this.model.findOne({ tokenId, nft: contractAddress }).exec();
    return !!buyNowItem;
  }

  async setNotValid(tokenId: number, contractAddress: string, marketplaceAddress: string): Promise<BuyNowItem> {
    const buyNowItem = await this.model
      .findOne({
        tokenId,
        nft: contractAddress,
        contract: marketplaceAddress,
        valid: true,
      })
      .sort({ createdAt: -1 })
      .exec();
    buyNowItem.valid = false;
    buyNowItem.save();
    return buyNowItem;
  }

  async finishListing(
    tokenId: string,
    sellerWallet: string,
    buyerWaller: string,
    price: number,
    contractAddress: string,
    marketplaceAddress: string,
  ): Promise<void> {
    const [sellerUser, buyerUser, track, buyNowItem] = await Promise.all([
      this.context.userService.getUserByWallet(sellerWallet),
      this.context.userService.getUserByWallet(buyerWaller),
      this.context.trackService.getTrackByTokenId(parseInt(tokenId), contractAddress),
      this.context.buyNowItemService.findBuyNowItem(parseInt(tokenId), contractAddress),
    ]);
    if (!sellerUser) {
      await Promise.all([
        this.context.buyNowItemService.setNotValid(parseInt(tokenId), contractAddress, marketplaceAddress),
        this.context.trackService.setPendingNone(parseInt(tokenId), contractAddress),
      ]);
      return;
    }
    const profileId = buyerUser?.profileId || new mongoose.Types.ObjectId('000000000000000000000000'); // Default ObjectId
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
        isPaymentOgun: buyNowItem.acceptsOGUN,
      }),
    ]);
    await Promise.all([
      this.context.buyNowItemService.setNotValid(parseInt(tokenId), contractAddress, marketplaceAddress),
      this.context.trackService.setPendingNone(parseInt(tokenId), contractAddress),
    ]);
  }
}
