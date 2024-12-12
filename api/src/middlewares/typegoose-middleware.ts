import { Document, Model } from 'mongoose';
import { MiddlewareFn } from 'type-graphql';

export const TypegooseMiddleware: MiddlewareFn = async (_, next) => {
  const result = await next();

  if (Array.isArray(result)) {
    return result.map(item => (item instanceof Model ? convertDocument(item) : item));
  }

  if (result instanceof Model) {
    return convertDocument(result);
  }

  return result;
};

function convertDocument(doc: Document) {
  const convertedDocument = doc.toObject();

  // Attempt to access schema options
  const schemaOptions = doc.constructor?.schema?.options || {}; // Fallback to empty object
  const DocumentClass = schemaOptions.class || doc.constructor;

  if (DocumentClass) {
    Object.setPrototypeOf(convertedDocument, DocumentClass.prototype);
  }

  return convertedDocument;
}
