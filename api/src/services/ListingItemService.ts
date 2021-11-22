import { TrackModel } from '../models/Track';
import { ListingItemPayload } from '../types/ListingItemPayload';
import { Service } from './Service';

export class ListingItemService extends Service {
  async getListingItem(tokenId: number): Promise<ListingItemPayload> {
    const listing = await TrackModel.aggregate([
      {
        $match: {
          'nftData.tokenId': tokenId,
        },
      },
      {
        $lookup: {
          from: 'auctionitems',
          as: 'auction',
          let: {
            tokenId: '$nftData.tokenId',
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    {
                      $eq: ['$tokenId', '$$tokenId'],
                    },
                  ],
                },
              },
            },
          ],
        },
      },
      {
        $lookup: {
          from: 'buynowitems',
          as: 'buynow',
          let: {
            tokenId: '$nftData.tokenId',
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    {
                      $eq: ['$tokenId', '$$tokenId'],
                    },
                  ],
                },
              },
            },
          ],
        },
      },
      {
        $unwind: {
          path: '$auction',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $unwind: {
          path: '$buynow',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $replaceRoot: {
          newRoot: {
            $mergeObjects: [{}, '$auction', '$buynow'],
          },
        },
      },
    ]);
    return listing[0];
  }
}
