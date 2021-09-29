import { getModelForClass, prop } from '@typegoose/typegoose';
import { Field, ID, ObjectType } from 'type-graphql';
import { Model } from './Model';

@ObjectType()
export class Track extends Model {
  @Field(() => ID, { name: 'id' })
  readonly _id: string;

  @Field()
  @prop({ required: true })
  profileId: string;

  @Field()
  @prop({ required: true })
  title: string;

  @Field()
  @prop({ required: true })
  audioUrl: string;

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;
}

export const TrackModel = getModelForClass(Track);
