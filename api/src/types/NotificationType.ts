import { registerEnumType } from 'type-graphql';

enum NotificationType {
  AuctionIsEnding = 'AuctionIsEnding',
  Comment = 'Comment',
  DeletedComment = 'DeletedComment',
  DeletedPost = 'DeletedPost',
  Follower = 'Follower',
  NewBid = 'NewBid',
  NewPost = 'NewPost',
  NewVerificationRequest = 'NewVerificationRequest',
  NFTSold = 'NFTSold',
  Outbid = 'Outbid',
  Reaction = 'Reaction',
  VerificationRequestUpdate = 'VerificationRequestUpdate',
  WonAuction = 'WonAuction',
}

registerEnumType(NotificationType, {
  name: 'NotificationType',
});

export { NotificationType };
