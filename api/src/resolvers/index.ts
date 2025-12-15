import { AuctionEndedNotificationResolver } from './AuctionEndedNotificationResolver';
import { AuctionIsEndingNotificationResolver } from './AuctionIsEndingNotificationResolver';
import { AuctionItemResolver } from './AuctionItemResolver';
import { AudioHolderResolver } from './AudioHolderResolver';
import { BidResolver } from './BidResolver';
import { BuyNowItemResolver } from './BuyNowItemResolver';
import { ChatResolver } from './ChatResolver';
import { CommentNotificationResolver } from './CommentNotificationResolver';
import { CommentResolver } from './CommentResolver';
import { DeletedCommentNotificationResolver } from './DeletedCommentNotificationResolver';
import { DeletedPostNotificationResolver } from './DeletedPostNotificationResolver';
import { ExploreResolver } from './ExploreResolver';
import { FeedResolver } from './FeedResolver';
import { FollowerNotificationResolver } from './FollowerNotificationResolver';
import { FollowResolver } from './FollowResolver';
import { ListingItemResolver } from './ListingItemResolver';
import { MessageResolver } from './MessageResolver';
import { NewBidNotificationResolver } from './NewBidNotificationResolver';
import { NewPostNotificationResolver } from './NewPostNotificationResolver';
import { NewVerificationRequestNotificationResolver } from './NewVerificationRequestNotificationResolver';
import { NFTSoldNotificationResolver } from './NFTSoldNotificationResolver';
import { NotificationResolver } from './NotificationResolver';
import { OutbidNotificationResolver } from './OutbidNotificationResolver';
import { PinningResolver } from './PinningResolver';
import { PolygonscanResolver } from './PolygonResolver';
import { PostResolver } from './PostResolver';
import { ProfileResolver } from './ProfileResolver';
import { ProfileVerificationRequestResolver } from './ProfileVerificationRequestResolver';
import { ReactionNotificationResolver } from './ReactionNotificationResolver';
import { ReactionResolver } from './ReactionResolver';
import { TrackEditionResolver } from './TrackEditionResolver';
import { TrackResolver } from './TrackResolver';
import { PlaylistResolver } from './PlaylistResolver';
import { UploadResolver } from './UploadResolver';
import { UserResolver } from './UserResolver';
import { VerificationRequestNotificationResolver } from './VerificationRequestNotificationResolver';
import { WhitelistEntryResolver } from './WhitelistEntryResolver';
import { WonAuctionNotificationResolver } from './WonAuctionNotificationResolver';
import { SCidResolver } from './SCidResolver';

export const resolvers = [
  AuctionEndedNotificationResolver,
  AuctionIsEndingNotificationResolver,
  AuctionItemResolver,
  BidResolver,
  BuyNowItemResolver,
  ChatResolver,
  CommentNotificationResolver,
  CommentResolver,
  DeletedCommentNotificationResolver,
  DeletedPostNotificationResolver,
  ExploreResolver,
  FeedResolver,
  FollowerNotificationResolver,
  FollowResolver,
  ListingItemResolver,
  MessageResolver,
  NewBidNotificationResolver,
  NewPostNotificationResolver,
  NewVerificationRequestNotificationResolver,
  NFTSoldNotificationResolver,
  NotificationResolver,
  OutbidNotificationResolver,
  PinningResolver,
  PolygonscanResolver,
  PostResolver,
  ProfileResolver,
  ProfileVerificationRequestResolver,
  ReactionNotificationResolver,
  ReactionResolver,
  TrackResolver,
  PlaylistResolver,
  UploadResolver,
  UserResolver,
  VerificationRequestNotificationResolver,
  WonAuctionNotificationResolver,
  WhitelistEntryResolver,
  AudioHolderResolver,
  TrackEditionResolver,
  SCidResolver,
] as const;
