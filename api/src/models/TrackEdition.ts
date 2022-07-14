import { getModelForClass, prop } from '@typegoose/typegoose';
import { Field, ID, ObjectType } from 'type-graphql';
import { EditionData } from '../types/EditionData';
import { Model } from './Model';

@ObjectType()
export class TrackEdition extends Model {
  @Field(() => ID, { name: 'id' })
  readonly _id: string;

  @Field()
  @prop()
  transactionHash: string;

  @Field()
  @prop()
  editionId: number;

  @Field()
  @prop({ default: false })
  listed: boolean;

  @Field({ nullable: true })
  @prop({ required: false })
  contract?: string;

  @Field({ nullable: true })
  @prop({ required: false })
  marketplace?: string;

  @Field(() => EditionData, { nullable: true })
  @prop()
  editionData?: EditionData;

  @Field()
  @prop()
  editionSize: number;

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;
}

export const TrackEditionModel = getModelForClass(TrackEdition);
