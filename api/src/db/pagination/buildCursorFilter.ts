import { DocumentType } from '@typegoose/typegoose';
import Model from 'models/Model';
import { FilterQuery } from 'mongoose';
import { decodeCursor } from './cursor';

export function buildCursorFilter<T extends typeof Model>(
  field: keyof DocumentType<InstanceType<T>>,
  ascending: boolean,
  before: string | undefined,
  after: string | undefined,
): Promise<FilterQuery<T>> {
  const op = ascending ? '$gt' : '$lt';
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
