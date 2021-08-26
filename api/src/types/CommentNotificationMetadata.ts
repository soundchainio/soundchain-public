export interface CommentNotificationMetadata {
  commentBody: string;
  authorName: string;
  authorPicture: string | undefined;
  commentId: string;
  postId: string;
}
