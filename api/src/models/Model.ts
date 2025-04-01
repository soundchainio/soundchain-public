import { modelOptions, Severity } from '@typegoose/typegoose';
import { Base } from '@typegoose/typegoose/lib/defaultClasses';
import mongoose from 'mongoose';

@modelOptions({
  schemaOptions: { timestamps: true },
  options: { allowMixed: Severity.ALLOW },
})
export class Model implements Base<mongoose.Types.ObjectId> {
  // Use ObjectId for `_id` to match Mongo documents
  public _id!: mongoose.Types.ObjectId;

  // If you still want a separate `id!: string;`, you can keep it,
  // or remove it if not needed. This line can stay if your code references `id`.
  public id!: string;
}
