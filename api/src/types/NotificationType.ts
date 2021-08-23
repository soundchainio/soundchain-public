import { registerEnumType } from 'type-graphql';

enum NotificationType {
  Comment = 'Comment',
}

registerEnumType(NotificationType, {
  name: 'NotificationType',
});

export { NotificationType };
