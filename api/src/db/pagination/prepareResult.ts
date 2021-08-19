import { DocumentType } from '@typegoose/typegoose';
import Model from 'models/Model';
import { encodeCursor } from './cursor';
import { PaginateResult } from './paginate';

export function prepareResult<T extends typeof Model>(
  field: keyof DocumentType<InstanceType<T>>,
  last: number | undefined,
  limit: number,
  after: string | undefined,
  before: string | undefined,
  results: DocumentType<InstanceType<T>>[],
  totalCount: number,
): PaginateResult<InstanceType<T>> {
  const hasMore = results.length > limit;
  const hasPreviousPage = Boolean(after || (before && hasMore));
  const hasNextPage = Boolean(before || hasMore);

  if (hasMore) {
    results.pop();
  }

  if (last) {
    results.reverse();
  }

  const startCursor = encodeCursor(results[0], field);
  const endCursor = encodeCursor(results[Math.max(0, results.length - 1)], field);

  return {
    pageInfo: {
      totalCount,
      hasNextPage,
      hasPreviousPage,
      startCursor,
      endCursor,
    },
    nodes: results,
  };
}
