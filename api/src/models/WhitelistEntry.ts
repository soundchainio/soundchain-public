import { getModelForClass, prop } from '@typegoose/typegoose';
import mongoose from 'mongoose';
import { Field, ID, ObjectType } from 'type-graphql';
import { Model } from './Model';

@ObjectType()
export class WhitelistEntry extends Model {
  @Field(() => ID, { name: 'id' })
  public override _id!: mongoose.Types.ObjectId;

  @Field({ nullable: false })
  @prop({ required: true })
  walletAddress: string;

  @Field({ nullable: false })
  @prop({ required: true })
  emailAddress: string;

  @Field({ nullable: true })
  @prop({ default: false })
  ogunClaimed?: boolean;

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;
}

export const WhitelistEntryModel = getModelForClass(WhitelistEntry);
