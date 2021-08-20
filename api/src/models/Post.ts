import { getModelForClass, prop } from '@typegoose/typegoose';
import { Field, ID, ObjectType } from 'type-graphql';
import { Model } from './Model';

@ObjectType()
export class Post extends Model {
  @Field(() => ID, { name: 'id' })
  readonly _id: string;

  @prop({ required: true })
  profileId: string;

  @Field()
  @prop({ required: true })
  body: string;

  @Field({ nullable: true })
  @prop({ required: false })
  mediaLink?: string;

  @Field({ nullable: true })
  @prop({ required: false })
  repostId?: string;

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;
}

export const PostModel = getModelForClass(Post);
