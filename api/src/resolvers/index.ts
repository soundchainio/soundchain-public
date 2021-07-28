import BookResolver from './BookResolver';
import { ProfileResolver } from './ProfileResolver';
import { UserResolver } from './UserResolver';

export default [BookResolver, UserResolver, ProfileResolver] as const;
