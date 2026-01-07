import { registerEnumType } from 'type-graphql';

enum NotificationType {
  AuctionIsEnding = 'AuctionIsEnding',
  AuctionEnded = 'AuctionEnded',
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
  // WIN-WIN Streaming Rewards
  OgunEarnedCreator = 'OgunEarnedCreator',     // Creator earned OGUN from stream
  OgunEarnedListener = 'OgunEarnedListener',   // Listener earned OGUN from streaming
  OgunEarnedCollaborator = 'OgunEarnedCollaborator', // Collaborator earned OGUN split
}

registerEnumType(NotificationType, {
  name: 'NotificationType',
});

export { NotificationType };
