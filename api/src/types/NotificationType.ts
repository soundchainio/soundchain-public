import { registerEnumType } from 'type-graphql';

enum NotificationType {
  Comment = 'Comment',
  Reaction = 'Reaction',
  Follower = 'Follower',
  NewPost = 'NewPost',
}

registerEnumType(NotificationType, {
  name: 'NotificationType',
});

export { NotificationType };
