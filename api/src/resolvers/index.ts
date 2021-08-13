import { CommentResolver } from './CommentResolver';
import { PostResolver } from './PostResolver';
import { ProfileResolver } from './ProfileResolver';
import { UserResolver } from './UserResolver';

export default [CommentResolver, PostResolver, ProfileResolver, UserResolver] as const;
