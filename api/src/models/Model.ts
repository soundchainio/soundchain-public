import { modelOptions, Severity } from '@typegoose/typegoose';
import { Base } from '@typegoose/typegoose/lib/defaultClasses';
import mongoose, { Types } from 'mongoose';

@modelOptions({
  schemaOptions: {
    timestamps: true, // Enable automatic `createdAt` and `updatedAt` fields
  },
  options: {
    allowMixed: Severity.ALLOW, // Allow mixed types
  },
})
export class Model implements Base<Types.ObjectId> {
  // Update `_id` type to use `mongoose.Types.ObjectId`
  _id!: Types.ObjectId; // MongoDB ID

  get id(): string {
    return this._id.toString(); // Return the ID as a string
  }
}
