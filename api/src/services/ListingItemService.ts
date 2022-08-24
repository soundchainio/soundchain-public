import { ObjectId } from 'mongodb';
import { AuctionItemModel } from '../models/AuctionItem';
import { BuyNowItemModel } from '../models/BuyNowItem';
import { ListingItem } from '../models/ListingItem';
import { TrackModel } from '../models/Track';
import { CurrencyType } from '../types/CurrencyType';
import { TrackPrice } from '../types/TrackPrice';
import { getNow } from '../utils/Time';
import { Service } from './Service';

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
                  {
                    $eq: ['$$item.nft', '$nftData.contract'],
                  },
                  {
                    $eq: ['$$item.valid', true],
                  },
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
      {
        $limit: 1,
      },
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
      return {
        value: 0,
        currency: CurrencyType.MATIC,
      };
    }
    const nft = transactionNfts[0];

    if (nft.OGUNPrice && nft.OGUNPrice > 0) {
      return {
        value: nft.OGUNPrice,
        currency: CurrencyType.OGUN,
      };
    }

    return {
      value: nft.price || 0,
      currency: CurrencyType.MATIC,
    };
  }
}
