import { DocumentType, ReturnModelType } from '@typegoose/typegoose';
import DataLoader from 'dataloader';
import { iteratee, keyBy } from 'lodash';
import { FilterQuery } from 'mongoose';
import { paginate, PaginateParams, PaginateResult } from '../db/pagination/paginate';
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

  getFindConditionForKeys(keys: readonly string[]): FilterQuery<T> {
    return { _id: { $in: keys } };
  }

  getKeyFromComponents(keyComponents: KeyComponents): string {
    if (typeof keyComponents === 'string') {
      return keyComponents;
    }

    return this.keyIteratee(keyComponents);
  }

  createDataLoader(): DataLoader<string, DocumentType<InstanceType<T>> | undefined> {
    return new DataLoader(async (keys: readonly string[]) => {
      const entities = await this.model.find(this.getFindConditionForKeys(keys));
      const entitiesByKey = keyBy(entities, this.keyIteratee);
      return keys.map(keys => entitiesByKey[keys]);
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

  async paginate(params: PaginateParams<T> = {}): Promise<PaginateResult<InstanceType<T>>> {
    return paginate(this.model, params);
  }
}
