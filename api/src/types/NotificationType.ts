import { registerEnumType } from 'type-graphql';

enum NotificationType {
  Comment = 'Comment',
  DeletedComment = 'DeletedComment',
  DeletedPost = 'DeletedPost',
  Follower = 'Follower',
  NewPost = 'NewPost',
  NewVerificationRequest = 'NewVerificationRequest',
  NFTSold = 'NFTSold',
  Reaction = 'Reaction',
  VerificationRequestUpdate = 'VerificationRequestUpdate',
  WonAuction = 'WonAuction',
}

registerEnumType(NotificationType, {
  name: 'NotificationType',
});

export { NotificationType };
