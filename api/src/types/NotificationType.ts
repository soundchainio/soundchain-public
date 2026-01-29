import { registerEnumType } from 'type-graphql';

enum NotificationType {
  // Auctions
  AuctionIsEnding = 'AuctionIsEnding',
  AuctionEnded = 'AuctionEnded',
  NewBid = 'NewBid',
  Outbid = 'Outbid',
  WonAuction = 'WonAuction',

  // Social
  Comment = 'Comment',
  Follower = 'Follower',
  Reaction = 'Reaction',
  NewPost = 'NewPost',
  Repost = 'Repost',                           // Someone reposted your post
  Mention = 'Mention',                         // Someone @mentioned you
  DirectMessage = 'DirectMessage',             // New DM received

  // Sales & Tips
  NFTSold = 'NFTSold',
  Tip = 'Tip',                                 // Someone tipped you OGUN
  MarketplaceOffer = 'MarketplaceOffer',       // Offer made on your NFT

  // Tracks & Playlists
  TrackComment = 'TrackComment',               // Comment on your track
  NewTrack = 'NewTrack',                       // Artist you follow uploaded a track
  PlaylistAdded = 'PlaylistAdded',             // Your track added to a playlist
  StreamMilestone = 'StreamMilestone',         // Hit stream milestone (100, 1K, 10K, etc.)

  // WIN-WIN Streaming Rewards
  OgunEarnedCreator = 'OgunEarnedCreator',     // Creator earned OGUN from stream
  OgunEarnedListener = 'OgunEarnedListener',   // Listener earned OGUN from streaming
  OgunEarnedCollaborator = 'OgunEarnedCollaborator', // Collaborator earned OGUN split

  // Admin & Verification
  NewVerificationRequest = 'NewVerificationRequest',
  VerificationRequestUpdate = 'VerificationRequestUpdate',
  DeletedComment = 'DeletedComment',
  DeletedPost = 'DeletedPost',
}

registerEnumType(NotificationType, {
  name: 'NotificationType',
});

export { NotificationType };
