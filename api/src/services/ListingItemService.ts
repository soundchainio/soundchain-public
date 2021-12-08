import { AuctionItemModel } from '../models/AuctionItem';
import { BuyNowItemModel } from '../models/BuyNowItem';
import { ListingItem, ListingItemModel } from '../models/ListingItem';
import { Context } from '../types/Context';
import { ModelService } from './ModelService';

export class ListingItemService extends ModelService<typeof ListingItem> {
  constructor(context: Context) {
    super(context, ListingItemModel);
  }

  async getListingItem(tokenId: number): Promise<ListingItem> {
    // we cant have lookup with uncorrelated queries, see https://docs.aws.amazon.com/documentdb/latest/developerguide/functional-differences.html#functional-differences.lookup
    const auctionItem = await (await AuctionItemModel.findOne({ tokenId, valid: true }))?.toObject();
    const buyNowItem = await (await BuyNowItemModel.findOne({ tokenId, valid: true }))?.toObject();
    return { ...auctionItem, ...buyNowItem };
  }

  async wasListedBefore(tokenId: number): Promise<boolean> {
    // we cant have lookup with uncorrelated queries, see https://docs.aws.amazon.com/documentdb/latest/developerguide/functional-differences.html#functional-differences.lookup
    const auctionItem = await (await AuctionItemModel.findOne({ tokenId, valid: true }))?.toObject();
    const buyNowItem = await (await BuyNowItemModel.findOne({ tokenId, valid: true }))?.toObject();
    return !!auctionItem || !!buyNowItem;
  }
}
