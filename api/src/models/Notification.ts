import { getModelForClass, modelOptions, prop, Severity } from '@typegoose/typegoose';
import { ObjectId } from 'mongodb';
import { Field } from 'type-graphql';
import { AuctionIsEndingNotification } from '../types/AuctionIsEndingNotification';
import { CommentNotificationMetadata } from '../types/CommentNotificationMetadata';
import { DeletedCommentNotificationMetadata } from '../types/DeletedCommentNotificationMetadata';
import { DeletedPostNotificationMetadata } from '../types/DeletedPostNotificationMetadata';
import { FollowerNotificationMetadata } from '../types/FollowerNotificationMetadata';
import { NewPostNotificationMetadata } from '../types/NewPostNotificationMetadata';
import { NewVerificationRequestNotificationMetadata } from '../types/NewVerificationRequestNotificationMetadata';
import { NFTSoldNotificationMetadata } from '../types/NFTSoldNotificationMetadata';
import { NotificationType } from '../types/NotificationType';
import { ReactionNotificationMetadata } from '../types/ReactionNotificationMetadata';
import { VerificationRequestNotificationMetadata } from '../types/VerificationRequestNotificationMetadata';
import { WonAuctionNotificationMetadata } from '../types/WonAuctionNotificationMetadata';
import { Model } from './Model';
@modelOptions({ options: { allowMixed: Severity.ALLOW } })
export class Notification extends Model {
  @prop({ required: true })
  type: NotificationType;

  @prop({ type: ObjectId, required: true })
  profileId: string;

  @prop({ required: true })
  metadata:
    | AuctionIsEndingNotification
    | CommentNotificationMetadata
    | DeletedCommentNotificationMetadata
    | FollowerNotificationMetadata
    | ReactionNotificationMetadata
    | NewPostNotificationMetadata
    | DeletedPostNotificationMetadata
    | NFTSoldNotificationMetadata
    | VerificationRequestNotificationMetadata
    | NewVerificationRequestNotificationMetadata
    | WonAuctionNotificationMetadata;

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;
}

export const NotificationModel = getModelForClass(Notification);
