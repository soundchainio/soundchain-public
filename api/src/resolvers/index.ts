import { CommentNotificationResolver } from './CommentNotificationResolver';
import { CommentResolver } from './CommentResolver';
import { NotificationResolver } from './NotificationResolver';
import { PostResolver } from './PostResolver';
import { ProfileResolver } from './ProfileResolver';
import { UploadResolver } from './UploadResolver';
import { UserResolver } from './UserResolver';

export default [
  CommentResolver,
  CommentNotificationResolver,
  NotificationResolver,
  PostResolver,
  ProfileResolver,
  UploadResolver,
  UserResolver,
] as const;
