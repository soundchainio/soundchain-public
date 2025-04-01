import { FilterQuery } from 'mongoose';
import { Model } from '../../models/Model';
import { decodeCursor } from './cursor';

// Removed "Promise<FilterQuery<T>>" since there's no async/await logic.
// Return a plain "FilterQuery<InstanceType<T>>" object instead.
export function buildCursorFilter<T extends typeof Model>(
  field: keyof InstanceType<T>,
  ascending: boolean,
  before: string | undefined,
  after: string | undefined,
  inclusive: boolean | undefined,
): FilterQuery<InstanceType<T>> {
  let op = ascending ? '$gt' : '$lt';
  if (inclusive) op += 'e'; // e.g. '$gte' or '$lte'

  const cursor = decodeCursor(before ?? after);

  // Cast to FilterQuery<InstanceType<T>> but use "any" for dynamic indexing.
  const cursorFilter = {} as FilterQuery<InstanceType<T>>;

  if (cursor) {
    if (Array.isArray(cursor)) {
      // For array cursors, build a compound filter with $or
      (cursorFilter as any).$or = [
        {
          [field]: {
            [op]: cursor[0],
          },
        },
        {
          [field]: {
            $eq: cursor[0],
          },
          _id: {
            [op]: cursor[1],
          },
        },
      ];
    } else {
      // Single-value cursor
      (cursorFilter as any)[field] = {
        [op]: cursor,
      };
    }
  }

  return cursorFilter;
}
