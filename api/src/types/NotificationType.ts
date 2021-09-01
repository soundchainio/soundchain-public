import { registerEnumType } from 'type-graphql';

enum NotificationType {
  Comment = 'Comment',
  Reaction = 'Reaction',
  Follower = 'Follower',
}

registerEnumType(NotificationType, {
  name: 'NotificationType',
});

export { NotificationType };
