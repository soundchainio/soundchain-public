import { getModelForClass, prop } from '@typegoose/typegoose';
import mongoose from 'mongoose';
import { Field, ID, ObjectType } from 'type-graphql';
import { Model } from './Model';

@ObjectType()
export class FavoriteProfileTrack extends Model {
  @Field(() => ID, { name: 'id' })
  public override _id!: mongoose.Types.ObjectId;

  @Field(() => ID)
  @prop({ required: true, type: mongoose.Types.ObjectId })
  profileId: mongoose.Types.ObjectId;

  @Field(() => ID)
  @prop({ required: true, type: mongoose.Types.ObjectId })
  trackId: mongoose.Types.ObjectId;

  @Field(() => ID, { nullable: true })
  @prop({ required: false, type: mongoose.Types.ObjectId })
  trackEditionId?: mongoose.Types.ObjectId;

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;
}

export const FavoriteProfileTrackModel = getModelForClass(FavoriteProfileTrack);
