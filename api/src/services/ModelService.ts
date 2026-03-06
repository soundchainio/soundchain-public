// @ts-nocheck
import { DocumentType, ReturnModelType } from '@typegoose/typegoose';
import DataLoader from 'dataloader';
import { iteratee, keyBy } from 'lodash';
import type { FilterQuery } from 'mongoose';
import { encodeCursor } from '../db/pagination/cursor';
import {
  paginate,
  paginateAggregated,
  PaginateParams,
  PaginateParamsAggregated,
  paginatePipelineAggregated,
  PaginateResult,
  PaginateSortParams,
} from '../db/pagination/paginate';
import { NotFoundError } from '../errors/NotFoundError';
import { Model } from '../models/Model';
import { Context } from '../types/Context';
import { Service } from './Service';

export class ModelService<T extends typeof Model, KeyComponents = string> extends Service {
  dataLoader: DataLoader<string, DocumentType<InstanceType<T>> | undefined>;

  constructor(context: Context, protected model: ReturnModelType<T>) {
    super(context);
    this.dataLoader = this.createDataLoader();
  }

  keyIteratee: (entity: Partial<DocumentType<InstanceType<T>>>) => string = iteratee('_id');

  // Changed return type to FilterQuery<InstanceType<T>> to allow child classes
  // to override with custom Mongoose queries (like $or).
  getFindConditionForKeys(keys: readonly string[]): FilterQuery<InstanceType<T>> {
    // Default logic: filter by _id in [keys]
    // Cast to FilterQuery<InstanceType<T>> so TS is happy.
    return { _id: { $in: keys } } as FilterQuery<InstanceType<T>>;
  }

  getKeyFromComponents(keyComponents: KeyComponents): string {
    if (typeof keyComponents === 'string') {
      return keyComponents;
    }
    return this.keyIteratee(keyComponents as Partial<DocumentType<InstanceType<T>>>);
  }

  createDataLoader(): DataLoader<string, DocumentType<InstanceType<T>> | undefined> {
    return new DataLoader(async (keys: readonly string[]) => {
      // Use .lean() to return plain objects for GraphQL serialization
      const entities = await this.model.find(this.getFindConditionForKeys(keys)).lean();
      const entitiesByKey = keyBy(entities, this.keyIteratee);
      return keys.map((key) => entitiesByKey[key]) as (DocumentType<InstanceType<T>> | undefined)[];
    });
  }

  async findOrFail(keyComponents: KeyComponents): Promise<InstanceType<T>> {
    const key = this.getKeyFromComponents(keyComponents);
    const entity = await this.dataLoader.load(key);

    if (!entity) {
      throw new NotFoundError(this.model.modelName, key);
    }

    return entity;
  }

  async exists(keyComponents: KeyComponents): Promise<boolean> {
    const key = this.getKeyFromComponents(keyComponents);
    const entity = await this.dataLoader.load(key);
    return Boolean(entity);
  }

  async paginate<S extends PaginateSortParams<T> = PaginateSortParams<T>>(
    params: PaginateParams<T, S> = {},
  ): Promise<PaginateResult<InstanceType<T>>> {
    return paginate(this.model, params);
  }

  getPageCursor(entity: InstanceType<T>, field: keyof InstanceType<T>): string | undefined {
    return encodeCursor(entity, field);
  }

  async getPageCursorById(keyComponents: KeyComponents, field: keyof InstanceType<T>): Promise<string | undefined> {
    const entity = await this.findOrFail(keyComponents);
    return this.getPageCursor(entity, field);
  }

  async paginateAggregated(params: PaginateParams<T> = {}): Promise<PaginateResult<InstanceType<T>>> {
    return paginateAggregated(this.model, params);
  }

  async paginatePipelineAggregated(params: PaginateParamsAggregated<T> = {}): Promise<PaginateResult<any>> {
    return paginatePipelineAggregated(this.model, params);
  }
}
// Deploy trigger 1765828075
