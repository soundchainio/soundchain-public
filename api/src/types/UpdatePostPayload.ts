import { Field, ObjectType } from 'type-graphql';
import { Post } from '../models/Post';

@ObjectType()
export class UpdatePostPayload {
  @Field()
  post: Post;
}
