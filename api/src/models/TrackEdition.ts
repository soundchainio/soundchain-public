import { getModelForClass, prop } from '@typegoose/typegoose';
import { Field, ID, ObjectType } from 'type-graphql';
import { Model } from './Model';

@ObjectType()
export class TrackEdition extends Model {
  @Field(() => ID, { name: 'id' })
  readonly _id: string;

  @prop()
  transactionHash: string;

  @prop()
  editionId: number;

  @prop()
  editionSize: number;

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;
}

export const TrackEditionModel = getModelForClass(TrackEdition);
