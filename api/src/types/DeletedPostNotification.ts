import { Field, ObjectType } from 'type-graphql';
import { NotificationType } from './NotificationType';

@ObjectType()
export class DeletedPostNotification {
  @Field(() => NotificationType)
  type: NotificationType;

  @Field(() => Date)
  createdAt: Date;
}
