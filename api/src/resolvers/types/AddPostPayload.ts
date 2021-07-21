import { Field, ObjectType } from 'type-graphql';
import Post from '../../models/Post';

@ObjectType()
export default class AddPostPayload {
  @Field()
  post: Post;
}
