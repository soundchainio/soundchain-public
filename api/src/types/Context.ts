import { User } from '../models/User';
import { AuthService } from '../services/AuthService';
import { CommentService } from '../services/CommentService';
import { EmailService } from '../services/EmailService';
import { JwtService, JwtUser } from '../services/JwtService';
import { PostService } from '../services/PostService';
import { ProfileService } from '../services/ProfileService';
import { UploadService } from '../services/UploadService';
import { UserService } from '../services/UserService';

export class Context {
  authService: AuthService;
  commentService: CommentService;
  emailService: EmailService;
  jwtService: JwtService;
  postService: PostService;
  profileService: ProfileService;
  uploadService: UploadService;
  userService: UserService;
  user?: Promise<User>;

  constructor(jwtUser?: JwtUser) {
    this.authService = new AuthService(this);
    this.commentService = new CommentService(this);
    this.emailService = new EmailService(this);
    this.jwtService = new JwtService(this);
    this.postService = new PostService(this);
    this.profileService = new ProfileService(this);
    this.uploadService = new UploadService(this);
    this.userService = new UserService(this);
    this.user = jwtUser && this.userService.getUser(jwtUser.sub);
  }
}
