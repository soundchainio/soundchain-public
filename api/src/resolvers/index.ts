import { CommentNotificationResolver } from './CommentNotificationResolver';
import { CommentResolver } from './CommentResolver';
import { FollowerNotificationResolver } from './FollowerNotificationResolver';
import { NotificationResolver } from './NotificationResolver';
import { PostResolver } from './PostResolver';
import { ProfileResolver } from './ProfileResolver';
import { UploadResolver } from './UploadResolver';
import { UserResolver } from './UserResolver';

export const resolvers = [
  CommentResolver,
  CommentNotificationResolver,
  FollowerNotificationResolver,
  NotificationResolver,
  PostResolver,
  ProfileResolver,
  UploadResolver,
  UserResolver,
] as const;
