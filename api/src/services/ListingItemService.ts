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

  async setNotValid(tokenId: number): Promise<ListingItem> {
    const listingItem = await this.model.findOne({ tokenId }).sort({ createdAt: -1 }).exec();
    listingItem.valid = false;
    listingItem.save();
    return listingItem;
  }
}
