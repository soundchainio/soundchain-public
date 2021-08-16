import { CommentResolver } from './CommentResolver';
import { PostResolver } from './PostResolver';
import { ProfileResolver } from './ProfileResolver';
import { UploadResolver } from './UploadResolver';
import { UserResolver } from './UserResolver';

export default [PostResolver, CommentResolver, ProfileResolver, UserResolver, UploadResolver] as const;
