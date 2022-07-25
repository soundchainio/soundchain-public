import DataLoader from 'dataloader';
import { BuyNowItemModel } from '../models/BuyNowItem';
import { groupBy, mapValues } from 'lodash';

export const ListingCountByTrackEdition = () => {
  return new DataLoader<string, number>(async (keys: readonly string[]) => {
    const entities = await BuyNowItemModel.find({
      trackEditionId: {
        $in: keys
      }
    })
    const grouped = mapValues(groupBy(entities, 'trackEditionId'), group => group.length);
    return keys.map(key => grouped[key] || 0)
  })
}