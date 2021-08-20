import { CommentResolver } from './CommentResolver';
import { PostResolver } from './PostResolver';
import { ProfileResolver } from './ProfileResolver';
import { ReactionResolver } from './ReactionResolver';
import { UploadResolver } from './UploadResolver';
import { UserResolver } from './UserResolver';

export const resolvers = [
  CommentResolver,
  PostResolver,
  ProfileResolver,
  ReactionResolver,
  UploadResolver,
  UserResolver,
] as const;
