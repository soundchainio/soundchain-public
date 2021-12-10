import { Field, ObjectType } from 'type-graphql';
import { Comment } from '../models/Comment';

@ObjectType()
export class UpdateCommentPayload {
  @Field()
  comment: Comment;
}
