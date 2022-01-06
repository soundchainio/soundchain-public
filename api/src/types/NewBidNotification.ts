import { Field, ObjectType } from 'type-graphql';
import { NotificationType } from './NotificationType';

@ObjectType()
export class NewBidNotification {
  @Field(() => NotificationType)
  type: NotificationType;

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;
}
