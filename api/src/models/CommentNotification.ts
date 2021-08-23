import { Field, ObjectType } from 'type-graphql';
import { NotificationType } from '../types/NotificationType';

export interface CommentNotificationMetadata {
  commentBody: string;
  authorName: string;
  authorPicture: string | undefined;
  commentId: string;
  postId: string;
}

@ObjectType()
export class CommentNotification {
  @Field(() => NotificationType)
  type: NotificationType;

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;
}
