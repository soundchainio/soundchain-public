import { Field, ObjectType } from 'type-graphql';
import { NotificationType } from './NotificationType';

/**
 * GenericNotification — Catch-all for notification types that don't have
 * dedicated ObjectType classes (Repost, Mention, Tip, StoryReaction, etc.)
 *
 * Without this, ANY unsupported type in the DB causes the ENTIRE notifications
 * query to fail with "Abstract type Notification must resolve to an Object type".
 */
@ObjectType()
export class GenericNotification {
  @Field(() => NotificationType)
  type: NotificationType;

  @Field(() => Date)
  createdAt: Date;

  @Field(() => String, { nullable: true })
  actorName?: string;

  @Field(() => String, { nullable: true })
  actorPicture?: string;
}
