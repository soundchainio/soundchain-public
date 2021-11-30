import { registerEnumType } from 'type-graphql';

enum NotificationType {
  Comment = 'Comment',
  Reaction = 'Reaction',
  Follower = 'Follower',
  NewPost = 'NewPost',
  NFTSold = 'NFTSold',
  VerificationRequestUpdate = 'VerificationRequestUpdate',
  NewVerificationRequest = 'NewVerificationRequest',
}

registerEnumType(NotificationType, {
  name: 'NotificationType',
});

export { NotificationType };
