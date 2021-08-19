import { CommentResolver } from './CommentResolver';
import { FollowResolver } from './FollowResolver';
import { PostResolver } from './PostResolver';
import { ProfileResolver } from './ProfileResolver';
import { UploadResolver } from './UploadResolver';
import { UserResolver } from './UserResolver';

export default [CommentResolver, FollowResolver, PostResolver, ProfileResolver, UploadResolver, UserResolver] as const;
