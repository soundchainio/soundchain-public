import { ListingItem, ListingItemModel } from '../models/ListingItem';
import { Context } from '../types/Context';
import { ModelService } from './ModelService';

interface NewListingItem {
  owner: string;
  nft: string;
  tokenId: number;
  quantity: number;
  pricePerItem: string;
  startingTime: number;
}

export class ListingItemService extends ModelService<typeof ListingItem> {
  constructor(context: Context) {
    super(context, ListingItemModel);
  }

  async createListingItem(params: NewListingItem): Promise<ListingItem> {
    const listingItem = new this.model(params);
    await listingItem.save();
    return listingItem;
  }

  async findListingItem(tokenId: number): Promise<ListingItem> {
    const listingItem = await this.model.findOne({ tokenId, valid: true }).sort({ createdAt: -1 }).exec();
    return listingItem;
  }

  async updateListingItem(tokenId: number, changes: Partial<ListingItem>): Promise<ListingItem> {
    const listingItem = await this.model
      .findOneAndUpdate({ tokenId, valid: true }, changes, { new: true })
      .sort({ createdAt: -1 })
      .exec();
    return listingItem;
  }

  async wasListedBefore(tokenId: number): Promise<boolean> {
    const listingItem = await this.model.findOne({ tokenId }).exec();
    return !!listingItem;
  }

  async setNotValid(tokenId: number): Promise<ListingItem> {
    const listingItem = await this.model.findOne({ tokenId }).sort({ createdAt: -1 }).exec();
    listingItem.valid = false;
    listingItem.save();
    return listingItem;
  }

  async finishListing(tokenId: string, sellerWallet: string, buyerWaller: string, price: string): Promise<void> {
    this.context.listingItemService.setNotValid(parseInt(tokenId));
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
    });
  }
}
