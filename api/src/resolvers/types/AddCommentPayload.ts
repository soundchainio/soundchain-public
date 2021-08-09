import { Field, ObjectType } from 'type-graphql';
import { Comment } from '../../models/Comment';

@ObjectType()
export default class AddCommentPayload {
  @Field()
  comment: Comment;
}
