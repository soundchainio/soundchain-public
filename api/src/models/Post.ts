import { getModelForClass, prop } from '@typegoose/typegoose';
import { Field, ID, ObjectType } from 'type-graphql';
import Model from './Model';

@ObjectType()
export default class Post extends Model {
  @Field(() => ID, { name: 'id' })
  readonly _id: string;

  @Field()
  @prop({ required: true })
  author: string;

  @Field()
  @prop({ required: true, maxlength:160 })
  body: string;

  @Field({nullable: true})
  @prop()
  embedUrl: string;

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;
}

export const PostModel = getModelForClass(Post);
