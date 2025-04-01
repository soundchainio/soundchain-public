import { getModelForClass, prop } from '@typegoose/typegoose';
import mongoose from 'mongoose';
import { Field, ID, ObjectType } from 'type-graphql';
import { ProfileVerificationStatusType } from '../types/ProfileVerificationStatusType';
import { Model } from './Model';

@ObjectType()
export class ProfileVerificationRequest extends Model {
  @Field(() => ID, { name: 'id' })
  public override _id!: mongoose.Types.ObjectId;

  @Field(() => ID, { nullable: false })
  @prop({ type: mongoose.Types.ObjectId, required: true })
  profileId: mongoose.Types.ObjectId;

  @Field({ nullable: true })
  @prop({ required: false })
  soundcloud?: string;

  @Field({ nullable: true })
  @prop({ required: false })
  youtube?: string;

  @Field({ nullable: true })
  @prop({ required: false })
  bandcamp?: string;

  @Field(() => ProfileVerificationStatusType, { nullable: true })
  @prop({ default: ProfileVerificationStatusType.PENDING, enum: ProfileVerificationStatusType })
  status: ProfileVerificationStatusType;

  @Field({ nullable: true })
  @prop({ required: false })
  reason?: string;

  @Field(() => ID, { nullable: true })
  @prop({ type: mongoose.Types.ObjectId, required: false })
  reviewerProfileId?: mongoose.Types.ObjectId;

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;
}

export const ProfileVerificationRequestModel = getModelForClass(ProfileVerificationRequest);
