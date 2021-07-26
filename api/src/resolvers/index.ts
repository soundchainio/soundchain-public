import BookResolver from './BookResolver';
import CommentResolver from './CommentResolver';
import UserResolver from './UserResolver';

export default [BookResolver, UserResolver, CommentResolver] as const;
