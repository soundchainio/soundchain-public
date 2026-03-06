import { getModelForClass, prop } from '@typegoose/typegoose';
import mongoose from 'mongoose';
import { Field, ID, ObjectType } from 'type-graphql';
import { Model } from './Model';

@ObjectType()
export class Playlist extends Model {
  @Field(() => ID, { name: 'id' })
  public override _id!: mongoose.Types.ObjectId;

  @Field(() => String)
  @prop({ required: true })
  title: string;

  @Field(() => String, { nullable: true })
  @prop()
  description?: string;

  @Field(() => String, { nullable: true })
  @prop()
  artworkUrl?: string;

  @Field(() => ID)
  @prop({ required: true, type: mongoose.Types.ObjectId })
  profileId: mongoose.Types.ObjectId;

  @prop({ default: 0 })
  playbackCount: number;

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;

  @Field(() => Boolean, { nullable: true })
  @prop({ default: false })
  deleted?: boolean;
}

export const PlaylistModel = getModelForClass(Playlist);
