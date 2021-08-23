import { Field, ObjectType } from 'type-graphql';
import { Post } from '../../models/Post';

@ObjectType()
export class UndoPostReactionPayload {
  @Field()
  post: Post;
}
