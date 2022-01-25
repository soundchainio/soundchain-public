import { FilterQuery } from 'mongoose';
import { Model } from '../../models/Model';
import { decodeCursor } from './cursor';

export function buildCursorFilter<T extends typeof Model>(
  field: keyof InstanceType<T>,
  ascending: boolean,
  before: string | undefined,
  after: string | undefined,
  inclusive: boolean | undefined,
): Promise<FilterQuery<T>> {
  let op = ascending ? '$gt' : '$lt';
  if (inclusive) op += 'e';
  const cursor = decodeCursor(before ?? after);
  const cursorFilter: FilterQuery<T> = {};

  if (cursor) {
    if (Array.isArray(cursor)) {
      cursorFilter.$or = [
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
      cursorFilter[field] = {
        [op]: cursor,
      };
    }
  }

  return cursorFilter;
}
