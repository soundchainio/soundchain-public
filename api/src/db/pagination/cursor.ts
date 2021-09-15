import { UserInputError } from 'apollo-server-express';
import base64url from 'base64-url';
import { EJSON } from 'bson';
import { Model } from '../../models/Model';

function assertStringOrArray(value: EJSON.SerializableTypes): asserts value is string | unknown[] {
  const isString = typeof value === 'string';
  const isStringArray = Array.isArray(value);

  if (!isString && !isStringArray) {
    throw new UserInputError('Pagination cursor is invalid');
  }
}

export function encodeCursor<T extends typeof Model>(
  doc: InstanceType<T> | undefined,
  field: keyof InstanceType<T>,
): string | undefined {
  if (doc) {
    return base64url.encode(EJSON.stringify(field === '_id' ? doc._id.toString() : [doc[field], doc._id.toString()]));
  }
}

export function decodeCursor(cursor?: string): string | unknown[] | undefined {
  if (cursor) {
    const fields = EJSON.parse(base64url.decode(cursor));
    assertStringOrArray(fields);
    return fields;
  }
}
