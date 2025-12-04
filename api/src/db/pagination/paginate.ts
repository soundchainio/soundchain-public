/* eslint-disable @typescript-eslint/no-explicit-any */
import { ReturnModelType, DocumentType } from '@typegoose/typegoose';
import * as mongoose from 'mongoose';
import { Model } from '../../models/Model';
import { PageInfo } from '../../types/PageInfo';
import { SortOrder } from '../../types/SortOrder';
import { buildCursorFilter } from './buildCursorFilter';
import { buildFilter } from './buildFilter';
import { buildQuerySort } from './buildQuerySort';
import { prepareResult } from './prepareResult';

export interface PaginateSortParams<T extends typeof Model> {
  field: keyof InstanceType<T>;
  order?: SortOrder;
}

export interface PaginateParams<
  T extends typeof Model,
  S extends PaginateSortParams<T> = PaginateSortParams<T>
> {
  filter?: mongoose.FilterQuery<T>;
  sort?: S;
  page?: {
    first?: number;
    after?: string;
    last?: number;
    before?: string;
    inclusive?: boolean;
  };
  group?: mongoose.FilterQuery<T>;
}

export interface PaginateParamsAggregated<T extends typeof Model> {
  filter?: mongoose.FilterQuery<T>;
  sort?: {
    field: any;
    order?: SortOrder;
  };
  page?: {
    first?: number;
    after?: string;
    last?: number;
    before?: string;
    inclusive?: boolean;
  };
  group?: mongoose.FilterQuery<T>;
  aggregation?: any[];
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

  // 1) Assert the .sort(...) argument
  // 2) Assert the result of .exec() as DocumentType<InstanceType<T>>[]
  const [rawResults, totalCount] = await Promise.all([
    collection
      .find({ $and: [cursorFilter, filter] })
      .sort(querySort as Record<string, 1 | -1>)
      .limit(limit + 1)
      .exec(),
    collection.find(filter).countDocuments().exec(),
  ]);

  const results = rawResults as DocumentType<InstanceType<T>>[];

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

  const [rawResults, totalCount] = await Promise.all([
    collection
      .aggregate([{ $match: filter }, { $group: group }, { $match: cursorFilter }])
      .sort(querySort as Record<string, 1 | -1>)
      .limit(limit + 1)
      .exec(),
    collection.find(filter).countDocuments().exec(),
  ]);

  // Assert .exec() result to DocumentType<InstanceType<T>>[]
  const results = rawResults as DocumentType<InstanceType<T>>[];

  return prepareResult(field, last, limit, after, before, results, totalCount);
}

export async function paginatePipelineAggregated<T extends typeof Model>(
  collection: ReturnModelType<T>,
  params: PaginateParamsAggregated<T>,
): Promise<PaginateResult<InstanceType<T>>> {
  const { filter = {}, sort = { field: 'createdAt' }, page = {}, aggregation } = params;
  const { field, order = SortOrder.ASC } = sort;
  const { first = 25, after, last, before, inclusive } = page;
  const ascending = (order === SortOrder.ASC) !== Boolean(last || before);
  const limit = last ?? first;

  const filterQuery = buildFilter(filter);
  const cursorFilter = buildCursorFilter(field, ascending, before, after, inclusive);
  const querySort = buildQuerySort(field, ascending);

  // Combine aggregator stages
  const rawResults = await collection
    .aggregate([...aggregation, { $match: filterQuery }, { $match: cursorFilter }])
    .sort(querySort as Record<string, 1 | -1>)
    .limit(limit + 1)
    .exec();

  // Hydrate plain aggregation results into proper mongoose documents
  const hydratedResults = rawResults.map((doc: any) => collection.hydrate(doc)) as DocumentType<InstanceType<T>>[];

  const totalCount =
    (
      await collection
        .aggregate([...aggregation, { $match: filterQuery }])
        .group({ _id: '$_id', count: { $sum: 1 } })
        .count('count')
        .exec()
    )[0]?.count ?? 0;

  return prepareResult(field, last, limit, after, before, hydratedResults, totalCount);
}
