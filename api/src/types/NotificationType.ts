import { registerEnumType } from 'type-graphql';

enum NotificationType {
  Comment = 'Comment',
  Reaction = 'Reaction',
}

registerEnumType(NotificationType, {
  name: 'NotificationType',
});

export { NotificationType };
