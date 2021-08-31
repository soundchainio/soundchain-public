import { registerEnumType } from 'type-graphql';

enum NotificationType {
  Comment = 'Comment',
  Follower = 'Follower',
}

registerEnumType(NotificationType, {
  name: 'NotificationType',
});

export { NotificationType };
