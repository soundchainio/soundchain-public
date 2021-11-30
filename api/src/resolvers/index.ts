import { AuctionItemResolver } from './AuctionItemResolver';
import { BuyNowItemResolver } from './BuyNowItemResolver';
import { ChatResolver } from './ChatResolver';
import { CommentNotificationResolver } from './CommentNotificationResolver';
import { CommentResolver } from './CommentResolver';
import { ExploreResolver } from './ExploreResolver';
import { FeedResolver } from './FeedResolver';
import { FollowerNotificationResolver } from './FollowerNotificationResolver';
import { FollowResolver } from './FollowResolver';
import { ListingItemResolver } from './ListingItemResolver';
import { MessageResolver } from './MessageResolver';
import { MintingRequestResolver } from './MintingRequestResolver';
import { NewPostNotificationResolver } from './NewPostNotificationResolver';
import { NewVerificationRequestNotificationResolver } from './NewVerificationRequestNotificationResolver';
import { NFTSoldNotificationResolver } from './NFTSoldNotificationResolver';
import { NotificationResolver } from './NotificationResolver';
import { PinningResolver } from './PinningResolver';
import { PolygonscanResolver } from './PolygonResolver';
import { PostResolver } from './PostResolver';
import { ProfileResolver } from './ProfileResolver';
import { ProfileVerificationRequestResolver } from './ProfileVerificationRequestResolver';
import { ReactionNotificationResolver } from './ReactionNotificationResolver';
import { ReactionResolver } from './ReactionResolver';
import { TrackResolver } from './TrackResolver';
import { UploadResolver } from './UploadResolver';
import { UserResolver } from './UserResolver';
import { VerificationRequestNotificationResolver } from './VerificationRequestNotificationResolver';

export const resolvers = [
  AuctionItemResolver,
  BuyNowItemResolver,
  ChatResolver,
  CommentNotificationResolver,
  CommentResolver,
  ExploreResolver,
  FeedResolver,
  FollowerNotificationResolver,
  FollowResolver,
  ListingItemResolver,
  MessageResolver,
  MintingRequestResolver,
  NewPostNotificationResolver,
  NFTSoldNotificationResolver,
  NotificationResolver,
  PinningResolver,
  PolygonscanResolver,
  PostResolver,
  ProfileResolver,
  ProfileVerificationRequestResolver,
  ReactionNotificationResolver,
  ReactionResolver,
  TrackResolver,
  UploadResolver,
  UserResolver,
  VerificationRequestNotificationResolver,
  NewVerificationRequestNotificationResolver,
] as const;
