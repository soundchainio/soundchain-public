import { ObjectId } from 'mongodb';
import { AuctionItemModel } from '../models/AuctionItem';
import { BuyNowItemModel } from '../models/BuyNowItem';
import { ListingItem } from '../models/ListingItem';
import { TrackModel } from '../models/Track';
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

  async getCheapestListingItem(trackEditionId: string): Promise<number> {
    const transactionNfts = (await TrackModel.aggregate([
      {
        '$match': {
          'trackEditionId': new ObjectId(trackEditionId),
        },
      },
      {
        '$lookup': {
          'from': 'buynowitems',
          'localField': 'nftData.tokenId',
          'foreignField': 'tokenId',
          'as': 'listingItem',
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
          listingItem: { $ne: [] }
        }
      },
      {
        '$sort': {
          'listingItem.pricePerItemToShow': 1,
        },
      },
      {
        '$limit': 1,
      },
      {
        '$replaceRoot': {
          'newRoot': {
            '$first': '$listingItem',
          },
        },
      },
      {
        '$project': {
          'price': '$pricePerItemToShow'
        }
      }
    ]));

    return transactionNfts.length ? transactionNfts[0]?.price : 0;
  }
}
