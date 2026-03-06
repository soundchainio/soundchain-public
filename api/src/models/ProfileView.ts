import { getModelForClass, index, modelOptions, prop, Severity } from '@typegoose/typegoose';
import mongoose from 'mongoose';
import { Field, ID, ObjectType } from 'type-graphql';
import { Model } from './Model';

@ObjectType()
@index({ viewerProfileId: 1, viewedProfileId: 1, createdAt: -1 })
@index({ viewedProfileId: 1, createdAt: -1 })
@modelOptions({
  schemaOptions: { timestamps: true },
  options: { allowMixed: Severity.ALLOW }
})
export class ProfileView extends Model {
  @Field(() => ID, { name: 'id' })
  public override _id!: mongoose.Types.ObjectId;

  @Field(() => String)
  @prop({ required: true })
  public viewerProfileId!: string;

  @Field(() => String)
  @prop({ required: true })
  public viewedProfileId!: string;

  @Field(() => Date)
  public createdAt!: Date;

  @Field(() => Date)
  public updatedAt!: Date;
}

export const ProfileViewModel = getModelForClass(ProfileView);
