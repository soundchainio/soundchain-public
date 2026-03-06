import mongoose from 'mongoose';

declare module 'mongoose' {
  namespace Types {
    interface ObjectId {
      toHexString(): string;
    }
  }
}
