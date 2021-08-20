import { CommentResolver } from './CommentResolver';
import { PostResolver } from './PostResolver';
import { ProfileResolver } from './ProfileResolver';
import { UploadResolver } from './UploadResolver';
import { UserResolver } from './UserResolver';

export const resolvers = [CommentResolver, PostResolver, ProfileResolver, UploadResolver, UserResolver] as const;
