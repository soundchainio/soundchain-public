export interface NewPostNotificationMetadata {
  authorName: string;
  authorPicture: string | undefined;
  postId: string;
  postBody: string;
  postLink?: string;
  trackId?: string;
}
