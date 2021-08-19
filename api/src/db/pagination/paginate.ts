import { DocumentType, ReturnModelType } from '@typegoose/typegoose';
import { SortOrder } from 'enums/SortOrder';
import Model from 'models/Model';
import { FilterQuery } from 'mongoose';
import { PageInfo } from 'resolvers/types/PageInfo';
import { buildCursorFilter } from './buildCursorFilter';
import { buildQuerySort } from './buildQuerySort';
import { prepareResult } from './prepareResult';

export interface PaginateParams<T extends typeof Model> {
  filter?: FilterQuery<T>;
  sort?: {
    field: keyof DocumentType<InstanceType<T>>;
    order?: SortOrder;
  };
  page?: {
    first?: number;
    after?: string;
    last?: number;
    before?: string;
  };
}

export interface PaginateResult<T> {
  pageInfo: PageInfo;
  nodes: T[];
}

export async function paginate<T extends typeof Model>(
  collection: ReturnModelType<T>,
  params: PaginateParams<T>,
): Promise<PaginateResult<InstanceType<T>>> {
  const { filter = {}, sort = { field: '_id' }, page = {} } = params;
  const { field, order = SortOrder.ASC } = sort;
  const { first = 25, after, last, before } = page;
  const ascending = (order === SortOrder.ASC) !== Boolean(last || before);
  const limit = last ?? first;

  const cursorFilter = buildCursorFilter(field, ascending, before, after);
  const querySort = buildQuerySort(field, ascending);

  const [results, totalCount] = await Promise.all([
    collection
      .find({ $and: [cursorFilter, filter] })
      .sort(querySort)
      .limit(limit + 1)
      .exec(),
    collection.find(filter).countDocuments().exec(),
  ]);

  return prepareResult(field, last, limit, after, before, results, totalCount);
}
