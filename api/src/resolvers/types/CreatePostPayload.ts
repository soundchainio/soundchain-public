import Post from 'models/Post';
import { Field, ObjectType } from 'type-graphql';

@ObjectType()
export class CreatePostPayload {
  @Field()
  post: Post;
}
