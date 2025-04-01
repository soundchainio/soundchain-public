import { getModelForClass, prop } from '@typegoose/typegoose';
import mongoose from 'mongoose';
import { Field, ID, ObjectType } from 'type-graphql';
import { Genre } from '../types/Genres';
import { MuxAsset } from '../types/MuxAsset';
import { NFTData } from '../types/NFTData';
import { Model } from './Model';
import { TrackEdition } from './TrackEdition';

@ObjectType()
export class Track extends Model {
  @Field(() => ID, { name: 'id' })
  public override _id!: mongoose.Types.ObjectId;

  @Field(() => ID)
  @prop({ type: mongoose.Types.ObjectId })
  profileId: mongoose.Types.ObjectId;

  @Field({ nullable: true })
  @prop()
  title: string;

  @Field({ nullable: true })
  @prop()
  description: string;

  @Field({ nullable: true })
  @prop()
  utilityInfo?: string;

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
  artistId: string;

  @Field({ nullable: true })
  @prop()
  artistProfileId: string;

  @Field({ nullable: true })
  @prop()
  album: string;

  @Field({ nullable: true })
  @prop()
  copyright: string;

  @Field({ nullable: true })
  @prop()
  releaseYear: number;

  @Field(() => [Genre], { nullable: true })
  @prop({ type: [String], enum: Genre })
  genres: Genre[];

  @Field(() => NFTData, { nullable: true })
  @prop()
  nftData: NFTData;

  @prop()
  muxAsset: MuxAsset;

  @prop({ default: 0 })
  playbackCount: number;

  @prop()
  favoriteCount: number;

  @prop()
  saleType: string;

  @Field({ nullable: true })
  @prop()
  ISRC: string;

  @Field()
  playbackCountFormatted: string;

  @Field({ nullable: true })
  @prop({ type: mongoose.Types.ObjectId })
  trackEditionId: string;

  @Field(() => TrackEdition, { nullable: true })
  trackEdition: TrackEdition;

  @Field({ nullable: true })
  @prop({ default: false })
  deleted?: boolean;

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;
}

export const TrackModel = getModelForClass(Track);
