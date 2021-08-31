import { Field, ObjectType } from 'type-graphql';
import { Comment } from '../models/Comment';

@ObjectType()
export class DeleteCommentPayload {
  @Field()
  comment: Comment;
}
