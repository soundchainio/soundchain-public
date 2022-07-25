import DataLoader from 'dataloader';
import { BuyNowItemModel } from '../models/BuyNowItem';
import { groupBy, keyBy, mapValues } from 'lodash';

export const ListingCountByTrackEdition = () => {
  return new DataLoader<string, number>(async (keys: readonly string[]) => {
    const keyStrings = keys.map(key => String(key))
    const entities = await BuyNowItemModel.aggregate([
      {
        $match: {
          trackEditionId: {
            $in: keyStrings
          }
        }
      },
      {
        $group: {
          _id: "$trackEditionId",
          total: {
            $sum: 1
          }
        }
      }
    ])
    const grouped = mapValues(keyBy(entities, '_id'), group => group.total);
    return keys.map(key => grouped[key] || 0)
  })
}