import { getModelForClass, prop } from '@typegoose/typegoose';
import { Field, ID, ObjectType } from 'type-graphql';
import { Model } from './Model';

@ObjectType()
export class LogError extends Model {
  @Field(() => ID, { name: 'id' })
  readonly _id: string;

  @Field({ nullable: true })
  @prop()
  title: string;

  @Field({ nullable: true })
  @prop()
  description: string;

  @Field(() => Date)
  createdAt: Date;
}

export const LogErrorModel = getModelForClass(LogError);
