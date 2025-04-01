import { ObjectId } from 'mongodb';
import { AuctionItem, AuctionItemModel } from '../models/AuctionItem';
import { BuyNowItem, BuyNowItemModel } from '../models/BuyNowItem';
// Remove or comment out if you no longer need ListingItem
// import { ListingItem } from '../models/ListingItem';
import { TrackModel } from '../models/Track';
import { CurrencyType } from '../types/CurrencyType';
import { TrackPrice } from '../types/TrackPrice';
import { getNow } from '../utils/Time';
import { Service } from './Service';

export class ListingItemService extends Service {
  // Return AuctionItem | BuyNowItem | undefined instead of ListingItem | void
  async getListingItem(tokenId: number, contractAddress: string): Promise<AuctionItem | BuyNowItem | undefined> {
    // We can’t have lookup with uncorrelated queries, see AWS DocumentDB differences
    const auctionItem = (await AuctionItemModel.findOne({ tokenId, nft: contractAddress, valid: true }))?.toObject();
    const buyNowItem = (await BuyNowItemModel.findOne({ tokenId, nft: contractAddress, valid: true }))?.toObject();
    return auctionItem ?? buyNowItem;
  }

  // Same union type for getActiveListingItem
  async getActiveListingItem(tokenId: number, contractAddress: string): Promise<AuctionItem | BuyNowItem | undefined> {
    const now = getNow();
    const auctionItem = (
      await AuctionItemModel.findOne({
        tokenId,
        nft: contractAddress,
        valid: true,
        endingTime: { $gte: now },
      })
    )?.toObject();
    const buyNowItem = (await BuyNowItemModel.findOne({ tokenId, nft: contractAddress, valid: true }))?.toObject();
    return auctionItem ?? buyNowItem;
  }

  async wasListedBefore(tokenId: number, contractAddress: string): Promise<boolean> {
    const auctionItem = (await AuctionItemModel.findOne({ tokenId, nft: contractAddress }))?.toObject();
    const buyNowItem = (await BuyNowItemModel.findOne({ tokenId, nft: contractAddress }))?.toObject();
    return !!auctionItem || !!buyNowItem;
  }

  // This method can remain unchanged if it doesn't need to return AuctionItem or BuyNowItem
  async getCheapestListingItem(trackEditionId: string): Promise<TrackPrice> {
    const transactionNfts = await TrackModel.aggregate([
      {
        $match: {
          trackEditionId: new ObjectId(trackEditionId),
        },
      },
      {
        $lookup: {
          from: 'buynowitems',
          localField: 'nftData.tokenId',
          foreignField: 'tokenId',
          as: 'listingItem',
        },
      },
      {
        $addFields: {
          listingItem: {
            $filter: {
              input: '$listingItem',
              as: 'item',
              cond: {
                $and: [
                  { $eq: ['$$item.nft', '$nftData.contract'] },
                  { $eq: ['$$item.valid', true] },
                ],
              },
            },
          },
        },
      },
      {
        $match: {
          listingItem: { $ne: [] },
        },
      },
      {
        $sort: {
          'listingItem.pricePerItemToShow': 1,
          'listingItem.OGUNPricePerItemToShow': 1,
        },
      },
      { $limit: 1 },
      {
        $project: {
          price: '$listingItem.pricePerItemToShow',
          OGUNPrice: '$listingItem.OGUNPricePerItemToShow',
        },
      },
      {
        $unwind: {
          path: '$price',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $unwind: {
          path: '$OGUNPrice',
          preserveNullAndEmptyArrays: true,
        },
      },
    ]);

    if (!transactionNfts.length) {
      return { value: 0, currency: CurrencyType.MATIC };
    }

    const nft = transactionNfts[0];
    if (nft.OGUNPrice && nft.OGUNPrice > 0) {
      return { value: nft.OGUNPrice, currency: CurrencyType.OGUN };
    }

    return { value: nft.price || 0, currency: CurrencyType.MATIC };
  }
}
