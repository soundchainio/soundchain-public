import { getModelForClass, index, modelOptions, prop, Severity } from '@typegoose/typegoose';
import mongoose from 'mongoose';
import { Field, ID, ObjectType } from 'type-graphql';
import { Model } from './Model';

/**
 * Push notification subscription stored from browser's Push API
 */
@ObjectType()
@index({ profileId: 1 })
@index({ endpoint: 1 })
@modelOptions({
  schemaOptions: { timestamps: true },
  options: { allowMixed: Severity.ALLOW }
})
export class PushSubscription extends Model {
  @Field(() => ID, { name: 'id' })
  public override _id!: mongoose.Types.ObjectId;

  @Field(() => String)
  @prop({ required: true })
  public profileId!: string;

  @Field(() => String)
  @prop({ required: true })
  public endpoint!: string;

  @prop({ required: true, type: mongoose.Schema.Types.Mixed })
  public keys!: {
    p256dh: string;
    auth: string;
  };

  @Field(() => String, { nullable: true })
  @prop({ required: false })
  public userAgent?: string;

  @Field(() => String, { nullable: true })
  @prop({ required: false })
  public deviceName?: string;

  @Field(() => Date)
  public createdAt!: Date;

  @Field(() => Date)
  public updatedAt!: Date;
}

export const PushSubscriptionModel = getModelForClass(PushSubscription);
