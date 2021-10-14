import { getModelForClass, prop } from '@typegoose/typegoose';
import { Field, ID, ObjectType } from 'type-graphql';
import { Genre } from '../types/Genres';
import { MuxAsset } from '../types/MuxAsset';
import { Model } from './Model';

@ObjectType()
export class Track extends Model {
  @Field(() => ID, { name: 'id' })
  readonly _id: string;

  @Field()
  @prop({ required: true })
  profileId: string;

  @Field({ nullable: true })
  @prop()
  title: string;

  @Field({ nullable: true })
  @prop()
  description: string;

  @Field()
  @prop({ required: true })
  assetUrl: string;

  @Field({ nullable: true })
  @prop()
  artworkUrl: string;

  @Field({ nullable: true })
  @prop()
  artist: string;

  @Field({ nullable: true })
  @prop()
  album: string;

  @Field({ nullable: true })
  @prop()
  releaseYear: number;

  @Field(() => [Genre], { nullable: true })
  @prop({ type: [String], enum: Genre })
  genres: Genre[];

  @Field({ nullable: true })
  @prop()
  transactionAddress: string;

  @prop()
  muxAsset: MuxAsset;

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;
}

export const TrackModel = getModelForClass(Track);
