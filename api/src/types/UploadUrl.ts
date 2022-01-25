import { modelOptions, prop } from '@typegoose/typegoose';
import { Field, ObjectType } from 'type-graphql';

@ObjectType()
@modelOptions({ schemaOptions: { _id: false } })
export class UploadUrl {
  @Field()
  @prop()
  uploadUrl: string;

  @Field()
  @prop()
  fileName: string;

  @Field()
  @prop()
  readUrl: string;
}
