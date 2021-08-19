import { CommentResolver } from './CommentResolver';
import { PostResolver } from './PostResolver';
import { ProfileResolver } from './ProfileResolver';
import { ReactionResolver } from './ReactionResolver';
import { UserResolver } from './UserResolver';

export default [CommentResolver, PostResolver, ProfileResolver, UserResolver, ReactionResolver] as const;
