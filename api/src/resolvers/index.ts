import { CommentResolver } from './CommentResolver';
import { FollowResolver } from './FollowResolver';
import { PostResolver } from './PostResolver';
import { ProfileResolver } from './ProfileResolver';
import { UserResolver } from './UserResolver';

export default [CommentResolver, PostResolver, ProfileResolver, UserResolver, FollowResolver] as const;
