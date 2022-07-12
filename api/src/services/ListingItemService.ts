import { AuctionItemModel } from '../models/AuctionItem';
import { BuyNowItemModel } from '../models/BuyNowItem';
import { ListingItem } from '../models/ListingItem';
import { getNow } from '../utils/Time';
import { Service } from './Service';
import { TrackModel } from '../models/Track';

export class ListingItemService extends Service {
  async getListingItem(tokenId: number, contractAddress: string): Promise<ListingItem | void> {
    // we cant have lookup with uncorrelated queries, see https://docs.aws.amazon.com/documentdb/latest/developerguide/functional-differences.html#functional-differences.lookup
    const auctionItem = (await AuctionItemModel.findOne({ tokenId, nft: contractAddress, valid: true }))?.toObject();
    const buyNowItem = (await BuyNowItemModel.findOne({ tokenId, nft: contractAddress, valid: true }))?.toObject();
    return auctionItem || buyNowItem;
  }

  async getActiveListingItem(tokenId: number, contractAddress: string): Promise<ListingItem | void> {
    const now = getNow();
    // we cant have lookup with uncorrelated queries, see https://docs.aws.amazon.com/documentdb/latest/developerguide/functional-differences.html#functional-differences.lookup
    const auctionItem = (
      await AuctionItemModel.findOne({ tokenId, nft: contractAddress, valid: true, endingTime: { $gte: now } })
    )?.toObject();
    const buyNowItem = (await BuyNowItemModel.findOne({ tokenId, nft: contractAddress, valid: true }))?.toObject();
    return auctionItem || buyNowItem;
  }

  async wasListedBefore(tokenId: number, contractAddress: string): Promise<boolean> {
    // we cant have lookup with uncorrelated queries, see https://docs.aws.amazon.com/documentdb/latest/developerguide/functional-differences.html#functional-differences.lookup
    const auctionItem = (await AuctionItemModel.findOne({ tokenId, nft: contractAddress }))?.toObject();
    const buyNowItem = (await BuyNowItemModel.findOne({ tokenId, nft: contractAddress }))?.toObject();
    return !!auctionItem || !!buyNowItem;
  }

  async getCheapestListingItem(transactionHash: string): Promise<ListingItem> {
    const transactionNfts = (await TrackModel.find({
      nftData: {
        transactionHash,
      },
    }));

    const buyNowItem = await BuyNowItemModel.findOne({
      tokenId: {
        $in: transactionNfts.map(nft => nft.nftData.tokenId),
      },
    }).sort({
      pricePerItemToShow: 1,
    });
    return buyNowItem?.toObject();
  }
}
