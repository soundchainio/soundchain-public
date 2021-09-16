import { getModelForClass, prop } from '@typegoose/typegoose';
import { Field, ID, ObjectType } from 'type-graphql';
import { AudioAsset } from '../types/AudioAsset';
import { AudioUpload } from '../types/AudioUpload';
import { Model } from './Model';

@ObjectType()
export class Track extends Model {
  @Field(() => ID, { name: 'id' })
  readonly _id: string;

  @prop({ required: true })
  profileId: string;

  @Field()
  @prop()
  upload: AudioUpload;

  @Field()
  @prop()
  asset: AudioAsset;

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;
}

export const TrackModel = getModelForClass(Track);
