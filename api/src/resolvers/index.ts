import { CommentNotificationResolver } from './CommentNotificationResolver';
import { CommentResolver } from './CommentResolver';
import { MessageResolver } from './MessageResolver';
import { FeedResolver } from './FeedResolver';
import { NotificationResolver } from './NotificationResolver';
import { PostResolver } from './PostResolver';
import { ProfileResolver } from './ProfileResolver';
import { UploadResolver } from './UploadResolver';
import { UserResolver } from './UserResolver';

export const resolvers = [
  CommentResolver,
  CommentNotificationResolver,
  FeedResolver,
  MessageResolver,
  NotificationResolver,
  PostResolver,
  ProfileResolver,
  UploadResolver,
  UserResolver,
] as const;
