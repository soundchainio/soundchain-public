import { getModelForClass, index, modelOptions, prop, Severity } from '@typegoose/typegoose';
import mongoose from 'mongoose';
import { Field, ID, ObjectType } from 'type-graphql';
import { Model } from './Model';

/**
 * CallSignal — ephemeral WebRTC signaling messages for voice/video calls.
 * TTL index auto-deletes signals after 60 seconds.
 */
@ObjectType()
@index({ recipientId: 1, createdAt: -1 })
@index({ createdAt: 1 }, { expireAfterSeconds: 60 })
@modelOptions({
  schemaOptions: { timestamps: true },
  options: { allowMixed: Severity.ALLOW }
})
export class CallSignal extends Model {
  @Field(() => ID, { name: 'id' })
  public override _id!: mongoose.Types.ObjectId;

  @Field(() => String)
  @prop({ required: true })
  public senderId!: string;

  @Field(() => String)
  @prop({ required: true })
  public recipientId!: string;

  @Field(() => String)
  @prop({ required: true })
  public callId!: string;

  @Field(() => String)
  @prop({ required: true })
  public signalType!: string;

  @Field(() => String)
  @prop({ required: true })
  public data!: string;

  @Field(() => Date)
  public createdAt!: Date;
}

export const CallSignalModel = getModelForClass(CallSignal);
