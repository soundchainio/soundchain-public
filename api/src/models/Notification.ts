import { getModelForClass, modelOptions, prop, Severity } from '@typegoose/typegoose';
import { NotificationType } from '../types/NotificationType';
import { CommentNotificationMetadata } from './CommentNotification';
import { Model } from './Model';

@modelOptions({ options: { allowMixed: Severity.ALLOW } })
export class Notification extends Model {
  @prop({ required: true })
  type: NotificationType;

  @prop({ required: true })
  profileId: string;

  @prop({ required: true })
  metadata: CommentNotificationMetadata;
}

export const NotificationModel = getModelForClass(Notification);
