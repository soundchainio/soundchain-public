import { getModelForClass, prop } from '@typegoose/typegoose';
import { Field, ID, ObjectType } from 'type-graphql';
import { Model } from './Model';

@ObjectType()
export class MintingRequest extends Model {
  @Field(() => ID, { name: 'id' })
  readonly _id: string;

  @prop({ required: true })
  profileId: string;

  @Field()
  @prop({ required: true })
  to: string;

  @Field()
  @prop({ required: true })
  name: string;

  @Field()
  @prop({ required: true })
  description: string;

  @Field()
  @prop({ required: true })
  assetKey: string;

  @Field({ nullable: true })
  artKey?: string;

  @Field({ nullable: true })
  minted?: boolean;

  @Field({ nullable: true })
  transactionId?: boolean;

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;
}

export const MintingRequestModel = getModelForClass(MintingRequest);
