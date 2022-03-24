import { getModelForClass, prop } from '@typegoose/typegoose';
import { Field, ID, ObjectType } from 'type-graphql';
import { Model } from './Model';

@ObjectType()
export class WhitelistEntry extends Model {
  @Field(() => ID, { name: 'id' })
  readonly _id: string;

  @Field({ nullable: false })
  @prop({ required: true })
  walletAddress?: string;

  @Field({ nullable: false })
  @prop({ required: true })
  emailAddress?: string;
}

export const WhitelistEntryModel = getModelForClass(WhitelistEntry);