import { getModelForClass, prop } from '@typegoose/typegoose';
import { Field, ID, ObjectType } from 'type-graphql';
import { Model } from './Model';

@ObjectType()
export class AudioHolder extends Model {
  @Field(() => ID, { name: 'id' })
  readonly _id: string;

  @Field({ nullable: false })
  @prop({ required: true })
  walletAddress: string;

  @Field({ nullable: false })
  @prop({ required: true })
  amount: string;

  @Field({ nullable: true })
  @prop({ default: false })
  ogunClaimed?: boolean;
}

export const AudioHolderModel = getModelForClass(AudioHolder);
