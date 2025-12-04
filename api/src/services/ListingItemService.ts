import { ObjectId } from 'mongodb';
import { AuctionItem, AuctionItemModel } from '../models/AuctionItem';
import { BuyNowItem, BuyNowItemModel } from '../models/BuyNowItem';
import { TrackModel } from '../models/Track';
import { CurrencyType } from '../types/CurrencyType';
import { TrackPrice } from '../types/TrackPrice';
import { getNow } from '../utils/Time';
import { Service } from './Service';

export class ListingItemService extends Service {
  // Return AuctionItem | BuyNowItem | undefined with chainId
  async getListingItem(tokenId: number, contractAddress: string, chainId?: number): Promise<AuctionItem | BuyNowItem | undefined> {
    const query: any = { tokenId, nft: contractAddress, valid: true };
    if (chainId) query['chainId'] = chainId; // Add chainId filter
    const auctionItem = (await AuctionItemModel.findOne(query))?.toObject();
    const buyNowItem = (await BuyNowItemModel.findOne(query))?.toObject();
    return auctionItem ?? buyNowItem;
  }

  // Same union type for getActiveListingItem with chainId
  async getActiveListingItem(tokenId: number, contractAddress: string, chainId?: number): Promise<AuctionItem | BuyNowItem | undefined> {
    const now = getNow();
    const query: any = { tokenId, nft: contractAddress, valid: true, endingTime: { $gte: now } };
    if (chainId) query['chainId'] = chainId; // Add chainId filter
    const auctionItem = (await AuctionItemModel.findOne(query))?.toObject();
    const buyNowItem = (await BuyNowItemModel.findOne({ tokenId, nft: contractAddress, valid: true }))?.toObject();
    return auctionItem ?? buyNowItem;
  }

  async wasListedBefore(tokenId: number, contractAddress: string, chainId?: number): Promise<boolean> {
    const query: any = { tokenId, nft: contractAddress };
    if (chainId) query['chainId'] = chainId; // Add chainId filter
    const auctionItem = (await AuctionItemModel.findOne(query))?.toObject();
    const buyNowItem = (await BuyNowItemModel.findOne(query))?.toObject();
    return !!auctionItem || !!buyNowItem;
  }

  // Update getCheapestListingItem to include chainId
  async getCheapestListingItem(trackEditionId: string, chainId?: number): Promise<TrackPrice> {
    const matchQuery: any = {
      trackEditionId: new ObjectId(trackEditionId),
    };
    if (chainId) matchQuery['chainId'] = chainId; // Add chainId filter

    const transactionNfts = await TrackModel.aggregate([
      {
        $match: matchQuery,
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
                  chainId ? { $eq: ['$$item.chainId', chainId] } : { $literal: true }, // ChainId filter - use $literal for DocumentDB compatibility
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
