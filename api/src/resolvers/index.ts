import { ChatResolver } from './ChatResolver';
import { CommentNotificationResolver } from './CommentNotificationResolver';
import { CommentResolver } from './CommentResolver';
import { FeedResolver } from './FeedResolver';
import { FollowerNotificationResolver } from './FollowerNotificationResolver';
import { FollowResolver } from './FollowResolver';
import { ListingItemResolver } from './ListingItemResolver';
import { MessageResolver } from './MessageResolver';
import { MintingRequestResolver } from './MintingRequestResolver';
import { NewPostNotificationResolver } from './NewPostNotificationResolver';
import { NFTSoldNotificationResolver } from './NFTSoldNotificationResolver';
import { NotificationResolver } from './NotificationResolver';
import { PinningResolver } from './PinningResolver';
import { PostResolver } from './PostResolver';
import { ProfileResolver } from './ProfileResolver';
import { ReactionNotificationResolver } from './ReactionNotificationResolver';
import { ReactionResolver } from './ReactionResolver';
import { TrackResolver } from './TrackResolver';
import { UploadResolver } from './UploadResolver';
import { UserResolver } from './UserResolver';

export const resolvers = [
  ChatResolver,
  CommentResolver,
  CommentNotificationResolver,
  FollowerNotificationResolver,
  FollowResolver,
  FeedResolver,
  MessageResolver,
  NewPostNotificationResolver,
  NotificationResolver,
  PostResolver,
  ProfileResolver,
  ReactionResolver,
  ReactionNotificationResolver,
  TrackResolver,
  UploadResolver,
  UserResolver,
  MintingRequestResolver,
  PinningResolver,
  ListingItemResolver,
  NFTSoldNotificationResolver,
] as const;
