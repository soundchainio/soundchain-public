import { getModelForClass, prop } from '@typegoose/typegoose';
import { NotificationType } from 'enums/NotificationType';
import { CommentNotificationMetadata } from './CommentNotification';
import { Model } from './Model';

export class Notification extends Model {
  @prop({ required: true })
  type: NotificationType;

  @prop({ required: true })
  profileId: string;

  @prop({ required: true })
  metadata: CommentNotificationMetadata;
}

export const NotificationModel = getModelForClass(Notification);
