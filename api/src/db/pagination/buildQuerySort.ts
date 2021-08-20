import { DocumentType } from '@typegoose/typegoose';
import Model from 'models/Model';

export function buildQuerySort<T extends typeof Model>(
  field: keyof DocumentType<InstanceType<T>>,
  ascending: boolean,
): Partial<Record<keyof DocumentType<InstanceType<T>>, number>> {
  const sortDir = ascending ? 1 : -1;

  const sortQuery: Partial<Record<keyof DocumentType<InstanceType<T>>, number>> = {};
  if (field === '_id') {
    sortQuery._id = sortDir;
  } else {
    sortQuery[field] = sortDir;
    sortQuery._id = sortDir;
  }

  return sortQuery;
}
