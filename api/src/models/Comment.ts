import { getModelForClass, prop, Ref } from '@typegoose/typegoose';
import { Field, ID, ObjectType } from 'type-graphql';
import Model from './Model';
import Post from './Post';
import { Profile } from './Profile';

@ObjectType()
export class Comment extends Model {
  @Field(() => ID, { name: 'id' })
  readonly _id: string;

  @Field()
  @prop({ required: true })
  body: string;

  @Field(() => Post)
  @prop({ required: true, ref: () => Post })
  post: Ref<Post>;

  @Field(() => Profile)
  @prop({ required: true, ref: () => Profile })
  profile: Ref<Profile>;

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;
}

export const CommentModel = getModelForClass(Comment);
