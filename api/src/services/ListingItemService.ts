import { ListingItem, ListingItemModel } from '../models/ListingItem';
import { Context } from '../types/Context';
import { ModelService } from './ModelService';

interface NewListingItem {
  owner: string;
  nft: string;
  tokenId: number;
  quantity: number;
  pricePerItem: number;
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
}
