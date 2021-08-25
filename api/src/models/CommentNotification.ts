import { Field, ObjectType } from 'type-graphql';
import { NotificationType } from '../types/NotificationType';

@ObjectType()
export class CommentNotification {
  @Field(() => NotificationType)
  type: NotificationType;

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;
}
