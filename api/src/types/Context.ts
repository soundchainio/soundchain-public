import { User } from '../models/User';
import { AuthService } from '../services/AuthService';
import { CommentService } from '../services/CommentService';
import { EmailService } from '../services/EmailService';
import { FollowService } from '../services/FollowService';
import { JwtService, JwtUser } from '../services/JwtService';
import { PostService } from '../services/PostService';
import { ProfileService } from '../services/ProfileService';
import { ReactionService } from '../services/ReactionService';
import { UploadService } from '../services/UploadService';
import { UserService } from '../services/UserService';

export class Context {
  authService = new AuthService(this);
  commentService = new CommentService(this);
  emailService = new EmailService(this);
  followService = new FollowService(this);
  jwtService = new JwtService(this);
  postService = new PostService(this);
  profileService = new ProfileService(this);
  reactionService = new ReactionService(this);
  uploadService = new UploadService(this);
  userService = new UserService(this);
  user?: Promise<User>;

  constructor(jwtUser?: JwtUser) {
    this.user = jwtUser && this.userService.getUser(jwtUser.sub);
  }
}
