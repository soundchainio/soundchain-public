import { ChatResolver } from './ChatResolver';
import { CommentNotificationResolver } from './CommentNotificationResolver';
import { CommentResolver } from './CommentResolver';
import { FeedResolver } from './FeedResolver';
import { FollowerNotificationResolver } from './FollowerNotificationResolver';
import { MessageResolver } from './MessageResolver';
import { NotificationResolver } from './NotificationResolver';
import { PostResolver } from './PostResolver';
import { ProfileResolver } from './ProfileResolver';
import { ReactionNotificationResolver } from './ReactionNotificationResolver';
import { UploadResolver } from './UploadResolver';
import { UserResolver } from './UserResolver';

export const resolvers = [
  ChatResolver,
  CommentResolver,
  CommentNotificationResolver,
  FollowerNotificationResolver,
  FeedResolver,
  MessageResolver,
  NotificationResolver,
  PostResolver,
  ProfileResolver,
  ReactionNotificationResolver,
  UploadResolver,
  UserResolver,
] as const;
