export type NotificationType = 'COMMENT' | 'FOLLOW' | 'LIKE' | 'POST'; // Adjust as needed
export interface CommentNotificationMetadata {
  commentId: string;
  postId: string;
}
export interface DeletedCommentNotificationMetadata {
  commentId: string;
  postId: string;
}
export interface DeletedPostNotificationMetadata {
  postId: string;
}
export interface FollowerNotificationMetadata {
  followerId: string;
}
export interface NewPostNotificationMetadata {
  postId: string;
}
export interface NewVerificationRequestNotificationMetadata {
  requestId: string;
}
export interface NFTSoldNotificationMetadata {
  nftId: string;
  buyerId: string;
}
export interface ReactionNotificationMetadata {
  reactionId: string;
}
export interface VerificationRequestNotificationMetadata {
  requestId: string;
}
export interface TrackWithPriceMetadata {
  trackId: string;
  price: number;
}
