import { getModelForClass, index, modelOptions, prop, Severity } from '@typegoose/typegoose';
import mongoose from 'mongoose';
import { Field, ID, ObjectType } from 'type-graphql';
import { Model } from './Model';

@ObjectType()
@index({ profileId: 1, pinned: -1, createdAt: -1 })
@index({ replyToId: 1, createdAt: -1 })
@modelOptions({
  schemaOptions: { timestamps: true },
  options: { allowMixed: Severity.ALLOW }
})
export class WallPost extends Model {
  @Field(() => ID, { name: 'id' })
  public override _id!: mongoose.Types.ObjectId;

  @Field(() => String)
  @prop({ required: true })
  public profileId!: string;

  @Field(() => String)
  @prop({ required: true })
  public authorProfileId!: string;

  @Field(() => String)
  @prop({ required: true, maxlength: 1000 })
  public body!: string;

  @Field(() => String, { nullable: true })
  @prop({ required: false })
  public replyToId?: string;

  @Field(() => Boolean)
  @prop({ required: true, default: false })
  public pinned!: boolean;

  @Field(() => Boolean)
  @prop({ required: true, default: false })
  public deleted!: boolean;

  @Field(() => Date)
  public createdAt!: Date;

  @Field(() => Date)
  public updatedAt!: Date;
}

export const WallPostModel = getModelForClass(WallPost);
