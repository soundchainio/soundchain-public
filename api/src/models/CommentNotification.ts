import { NotificationType } from 'enums/NotificationType';
import { Field, ObjectType } from 'type-graphql';

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

  @Field()
  body: string;

  @Field()
  previewBody: string;

  @Field()
  link: string;

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;
}
