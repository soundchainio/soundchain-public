import { PaginateResult } from '../db/pagination/paginate';
import { AuctionItemModel } from '../models/AuctionItem';
import { BuyNowItemModel } from '../models/BuyNowItem';
import { ListingItemModel, ListingItemView } from '../models/ListingItem';
import { Context } from '../types/Context';
import { PageInput } from '../types/PageInput';
import { SortListingItemInput } from '../types/SortListingItemInput';
import { ModelService } from './ModelService';

export class ListingItemService extends ModelService<typeof ListingItemView> {
  constructor(context: Context) {
    super(context, ListingItemModel);
  }

  async getListingItem(tokenId: number): Promise<ListingItemView> {
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

  getListingItems(sort?: SortListingItemInput, page?: PageInput): Promise<PaginateResult<ListingItemView>> {
    return this.paginate({ sort, page });
  }
}
