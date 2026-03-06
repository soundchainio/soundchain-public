export interface DeletedCommentNotificationMetadata {
  commentBody: string;
  authorName: string;
  authorPicture: string | undefined;
  commentId: string;
  postId: string;
}
