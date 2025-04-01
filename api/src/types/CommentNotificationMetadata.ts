import mongoose from 'mongoose';

export interface CommentNotificationMetadata {
  commentBody: string;
  authorName: string;
  authorPicture: string | undefined;
  commentId: mongoose.Types.ObjectId;
  postId: mongoose.Types.ObjectId;
}
