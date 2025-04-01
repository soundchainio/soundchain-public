import { FilterQuery } from 'mongoose';
import { Model } from '../../models/Model';

// This version removes "Promise<FilterQuery<T>>" since there's no async/await
// and uses type assertions to avoid TS indexing errors.

export function buildFilter<T extends typeof Model>(field: FilterQuery<T>): FilterQuery<T> {
  // Start with a blank filter object. We'll cast it to FilterQuery<T> at the end.
  // Using "any" for dynamic indexing to hush TS errors about [key].
  const filter = {} as FilterQuery<T>;

  for (const [key, values] of Object.entries(field)) {
    if (Array.isArray(values)) {
      // If the input is an array, we build an $or array of sub-filters.
      // Cast it so TS sees it as an array of FilterQuery<T>.
      (filter as any).$or = [];
      values.forEach(value => {
        (filter as any).$or.push({
          [key]: {
            $eq: value,
          },
        });
      });
    } else {
      // Single value. Cast to "any" so we can index by [key].
      (filter as any)[key] = values;
    }
  }

  // Return the filter as a FilterQuery<T>.
  return filter as FilterQuery<T>;
}
