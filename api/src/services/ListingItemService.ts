import { AuctionItemModel } from '../models/AuctionItem';
import { BuyNowItemModel } from '../models/BuyNowItem';
import { ListingItem } from '../models/ListingItem';
import { getNow } from '../utils/Time';
import { Service } from './Service';

export class ListingItemService extends Service {
  async getListingItem(tokenId: number): Promise<ListingItem | void> {
    // we cant have lookup with uncorrelated queries, see https://docs.aws.amazon.com/documentdb/latest/developerguide/functional-differences.html#functional-differences.lookup
    const auctionItem = (await AuctionItemModel.findOne({ tokenId, valid: true }))?.toObject();
    const buyNowItem = (await BuyNowItemModel.findOne({ tokenId, valid: true }))?.toObject();
    return auctionItem || buyNowItem;
  }

  async getActiveListingItem(tokenId: number): Promise<ListingItem | void> {
    const now = getNow();
    // we cant have lookup with uncorrelated queries, see https://docs.aws.amazon.com/documentdb/latest/developerguide/functional-differences.html#functional-differences.lookup
    const auctionItem = (
      await AuctionItemModel.findOne({ tokenId, valid: true, endingTime: { $gte: now } })
    )?.toObject();
    const buyNowItem = (await BuyNowItemModel.findOne({ tokenId, valid: true }))?.toObject();
    return auctionItem || buyNowItem;
  }

  async wasListedBefore(tokenId: number): Promise<boolean> {
    // we cant have lookup with uncorrelated queries, see https://docs.aws.amazon.com/documentdb/latest/developerguide/functional-differences.html#functional-differences.lookup
    const auctionItem = (await AuctionItemModel.findOne({ tokenId }))?.toObject();
    const buyNowItem = (await BuyNowItemModel.findOne({ tokenId }))?.toObject();
    return !!auctionItem || !!buyNowItem;
  }
}
