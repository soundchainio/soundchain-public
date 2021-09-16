import { modelOptions, prop } from '@typegoose/typegoose';
import { Field, ObjectType } from 'type-graphql';

@ObjectType()
@modelOptions({ schemaOptions: { _id: false } })
export class AudioAsset {
  @prop()
  id: string;

  @Field()
  @prop()
  playbackId: string;
}
