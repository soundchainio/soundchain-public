import { ReturnModelType } from '@typegoose/typegoose';
import { FilterQuery } from 'mongoose';
import { Model } from '../../models/Model';
import { PageInfo } from '../../types/PageInfo';
import { SortOrder } from '../../types/SortOrder';
import { buildCursorFilter } from './buildCursorFilter';
import { buildQuerySort } from './buildQuerySort';
import { prepareResult } from './prepareResult';

export interface PaginateParams<T extends typeof Model> {
  filter?: FilterQuery<T>;
  sort?: {
    field: keyof InstanceType<T>;
    order?: SortOrder;
  };
  page?: {
    first?: number;
    after?: string;
    last?: number;
    before?: string;
    inclusive?: boolean;
  };
  group?: FilterQuery<T>;
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
  const { first = 25, after, last, before, inclusive } = page;
  const ascending = (order === SortOrder.ASC) !== Boolean(last || before);
  const limit = last ?? first;

  const cursorFilter = buildCursorFilter(field, ascending, before, after, inclusive);
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

export async function paginateAggregated<T extends typeof Model>(
  collection: ReturnModelType<T>,
  params: PaginateParams<T>,
): Promise<PaginateResult<InstanceType<T>>> {
  const { filter = {}, sort = { field: '_id' }, page = {}, group = {} } = params;
  const { field, order = SortOrder.ASC } = sort;
  const { first = 25, after, last, before, inclusive } = page;
  const ascending = (order === SortOrder.ASC) !== Boolean(last || before);
  const limit = last ?? first;

  const cursorFilter = buildCursorFilter(field, ascending, before, after, inclusive);
  const querySort = buildQuerySort(field, ascending);

  const [results, totalCount] = await Promise.all([
    collection
      .aggregate([{ $match: filter }, { $group: group }, { $match: cursorFilter }])
      .sort(querySort)
      .limit(limit + 1)
      .exec(),
    collection.find(filter).countDocuments().exec(),
  ]);

  return prepareResult(field, last, limit, after, before, results, totalCount);
}

export async function paginateAggregatedTest<T extends typeof Model>(
  collection: ReturnModelType<T>,
  aggregation: any,
  params: PaginateParams<T>,
): Promise<PaginateResult<InstanceType<T>>> {
  const { filter = {}, sort = { field: '_id' }, page = {}, group = {} } = params;
  const { field, order = SortOrder.ASC } = sort;
  const { first = 25, after, last, before, inclusive } = page;
  const ascending = (order === SortOrder.ASC) !== Boolean(last || before);
  const limit = last ?? first;

  const cursorFilter = buildCursorFilter(field, ascending, before, after, inclusive);
  const querySort = buildQuerySort(field, ascending);

  const [results, totalCount] = await Promise.all([
    collection
      .aggregate([
        {
          $lookup: {
            from: 'buynowitems',
            localField: 'nftData.tokenId',
            foreignField: 'tokenId',
            as: 'buynowitem',
          },
        },
        {
          $lookup: {
            from: 'auctionitems',
            localField: 'nftData.tokenId',
            foreignField: 'tokenId',
            as: 'auctionitem',
          },
        },
        {
          $addFields: {
            auctionitem: {
              $filter: {
                input: '$auctionitem',
                as: 'item',
                cond: {
                  $eq: ['$$item.valid', true],
                },
              },
            },
            buynowitem: {
              $filter: {
                input: '$buynowitem',
                as: 'item',
                cond: {
                  $eq: ['$$item.valid', true],
                },
              },
            },
          },
        },
        {
          $addFields: {
            listing: {
              $concatArrays: ['$auctionitem', '$buynowitem'],
            },
          },
        },
        {
          $project: {
            buynowitem: 0,
            auctionitem: 0,
          },
        },
        {
          $unwind: {
            path: '$listing',
          },
        },
        { $match: cursorFilter },
      ])
      .sort(querySort)
      .limit(limit + 1)
      .exec(),
    collection.find(filter).countDocuments().exec(),
  ]);

  return prepareResult(field, last, limit, after, before, results, totalCount);
}
