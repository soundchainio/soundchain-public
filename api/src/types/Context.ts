import { User } from '../models/User';
import { AuthService } from '../services/AuthService';
import { CommentService } from '../services/CommentService';
import { EmailService } from '../services/EmailService';
import { EmbedService } from '../services/EmbedService';
import { FeedService } from '../services/FeedService';
import { FollowService } from '../services/FollowService';
import { JwtService, JwtUser } from '../services/JwtService';
import { MessageService } from '../services/MessageService';
import { MuxService } from '../services/MuxService';
import { NotificationService } from '../services/NotificationService';
import { PostService } from '../services/PostService';
import { ProfileService } from '../services/ProfileService';
import { ReactionService } from '../services/ReactionService';
import { SubscriptionService } from '../services/SubscriptionService';
import { TrackService } from '../services/TrackService';
import { UploadService } from '../services/UploadService';
import { UserService } from '../services/UserService';

export class Context {
  authService = new AuthService(this);
  commentService = new CommentService(this);
  emailService = new EmailService(this);
  feedService = new FeedService(this);
  followService = new FollowService(this);
  jwtService = new JwtService(this);
  messageService = new MessageService(this);
  muxService = new MuxService(this);
  notificationService = new NotificationService(this);
  postService = new PostService(this);
  profileService = new ProfileService(this);
  reactionService = new ReactionService(this);
  subscriptionService = new SubscriptionService(this);
  trackService = new TrackService(this);
  uploadService = new UploadService(this);
  userService = new UserService(this);
  embedService = new EmbedService(this);
  user?: Promise<User>;

  constructor(jwtUser?: JwtUser) {
    this.user = jwtUser && this.userService.getUser(jwtUser.sub);
  }
}
