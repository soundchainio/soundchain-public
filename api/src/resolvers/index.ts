import { PostResolver } from './PostResolver';
import { ProfileResolver } from './ProfileResolver';
import { UploadResolver } from './UploadResolver';
import { UserResolver } from './UserResolver';

export default [PostResolver, ProfileResolver, UserResolver, UploadResolver] as const;
