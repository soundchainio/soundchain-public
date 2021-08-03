import { BookResolver } from './BookResolver';
import { PostResolver } from './PostResolver';
import { ProfileResolver } from './ProfileResolver';
import { UserResolver } from './UserResolver';

export default [BookResolver, PostResolver, ProfileResolver, UserResolver] as const;
