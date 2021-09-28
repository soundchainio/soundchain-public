import { getModelForClass, prop } from '@typegoose/typegoose';
import { Field, ID, ObjectType } from 'type-graphql';
import { MuxAsset } from '../types/MuxAsset';
import { MuxUpload } from '../types/MuxUpload';
import { Model } from './Model';

@ObjectType()
export class Track extends Model {
  @Field(() => ID, { name: 'id' })
  readonly _id: string;

  @prop({ required: true })
  profileId: string;

  @Field()
  @prop()
  title: string;

  @Field({ nullable: true })
  @prop()
  description: string;

  @prop({ required: true })
  file: string;

  @Field()
  @prop()
  uploadUrl: string;

  @Field()
  @prop()
  muxUpload: MuxUpload;

  @Field()
  @prop()
  muxAsset: MuxAsset;

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;
}

export const TrackModel = getModelForClass(Track);
