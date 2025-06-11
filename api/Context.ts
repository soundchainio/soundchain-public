import * as Sentry from '@sentry/node';
import { ListingCountByTrackEdition } from '../loaders/ListingCountByTrackEdition';
import { User } from '../models/User';
import { AuctionItemService } from '../services/AuctionItemService';
import { AudioHolderService } from '../services/AudioHolderService';
import { AuthService } from '../services/AuthService';
import { BidService } from '../services/BidService';
import { BlockTrackerService } from '../services/BlockTrackerService';
import { BuyNowService } from '../services/BuyNowItemService';
import { CommentService } from '../services/CommentService';
import { EmailService } from '../services/EmailService';
import { EmbedService } from '../services/EmbedService';
import { ExploreService } from '../services/ExploreService';
import { FeedService } from '../services/FeedService';
import { FollowService } from '../services/FollowService';
import { JwtService, JwtUser } from '../services/JwtService';
import { ListingItemService } from '../services/ListingItemService';
import { LogErrorService } from '../services/LogErrorService';
import { MailchimpService } from '../services/MailchimpService';
import { MessageService } from '../services/MessageService';
import { MuxService } from '../services/MuxService';
import { NotificationService } from '../services/NotificationService';
import { PinningService } from '../services/PinningService';
import { PolygonscanService } from '../services/PolygonService';
import { PostService } from '../services/PostService';
import { ProfileService } from '../services/ProfileService';
import { ProfileVerificationRequestService } from '../services/ProfileVerificationRequestService';
import { ProofBookService } from '../services/ProofBookService';
import { ReactionService } from '../services/ReactionService';
import { SubscriptionService } from '../services/SubscriptionService';
import { TrackEditionService } from '../services/TrackEditionService';
import { TrackService } from '../services/TrackService';
import { UploadService } from '../services/UploadService';
import { UserService } from '../services/UserService';
import { WhitelistEntryService } from '../services/WhitelistEntryService';
import { PlaylistService } from '../services/PlaylistService';

export class Context {
  auctionItemService = new AuctionItemService(this);
  authService = new AuthService(this);
  blockTrackerService = new BlockTrackerService(this);
  buyNowItemService = new BuyNowService(this);
  commentService = new CommentService(this);
  emailService = new EmailService(this);
  embedService = new EmbedService(this);
  exploreService = new ExploreService(this);
  feedService = new FeedService(this);
  followService = new FollowService(this);
  jwtService = new JwtService(this);
  logErrorService = new LogErrorService(this);
  messageService = new MessageService(this);
  muxService = new MuxService(this);
  notificationService = new NotificationService(this);
  pinningService = new PinningService(this);
  polygonscanService = new PolygonscanService(this);
  postService = new PostService(this);
  playlistService = new PlaylistService(this);
  profileService = new ProfileService(this);
  proofBookService = new ProofBookService(this);
  profileVerificationRequestService = new ProfileVerificationRequestService(this);
  reactionService = new ReactionService(this);
  subscriptionService = new SubscriptionService(this);
  trackService = new TrackService(this);
  uploadService = new UploadService(this);
  userService = new UserService(this);
  bidService = new BidService(this);
  listingItemService = new ListingItemService(this);
  user?: Promise<User>;
  whitelistEntryService = new WhitelistEntryService(this);
  audioHolderService = new AudioHolderService(this);
  trackEditionService = new TrackEditionService(this);
  listingCountByTrackEdition = ListingCountByTrackEdition();
  sentryTransaction = Sentry.startTransaction({
    op: 'gql',
    name: 'GraphQLTransaction', // this will be the default name, unless the gql query has a name
  });
  mailchimpService = new MailchimpService(this);

  constructor(jwtUser?: JwtUser) {
    this.user = jwtUser && this.userService.getUser(jwtUser.sub);
  }
}
