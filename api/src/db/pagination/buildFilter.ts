import { FilterQuery } from 'mongoose';
import { Model } from '../../models/Model';

export function buildFilter<T extends typeof Model>(field: FilterQuery<T>): Promise<FilterQuery<T>> {
  const filter: FilterQuery<T> = {};
  for (const [key, values] of Object.entries(field)) {
    if (Array.isArray(values)) {
      filter.$or = [];
      values.forEach(value => {
        filter.$or.push({
          [key]: {
            $eq: value,
          },
        });
      });
    } else {
      filter[key] = values;
    }
  }
  return filter;
}
