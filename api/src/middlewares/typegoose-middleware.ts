import { Document, Model } from 'mongoose';
import { MiddlewareFn } from 'type-graphql';
import { mongoose } from '@typegoose/typegoose'; // Adjusted for Typegoose compatibility

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

  // Use Mongoose's built-in method to set the prototype
  const DocumentClass = mongoose.models[doc.constructor.name];
  if (DocumentClass) {
    Object.setPrototypeOf(convertedDocument, DocumentClass.prototype);
  }

  return convertedDocument;
}
