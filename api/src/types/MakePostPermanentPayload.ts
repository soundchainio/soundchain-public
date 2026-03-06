import { Field, ObjectType } from 'type-graphql';
import { Post } from '../models/Post';

@ObjectType()
export class MakePostPermanentPayload {
  @Field(() => Post, { nullable: true })
  post?: Post;

  @Field(() => Boolean)
  success!: boolean;

  @Field(() => String, { nullable: true })
  error?: string;
}

@ObjectType()
export class RemoveFromPermanentPayload {
  @Field(() => Post, { nullable: true })
  post?: Post;

  @Field(() => Boolean)
  success!: boolean;

  @Field(() => String, { nullable: true })
  error?: string;
}
