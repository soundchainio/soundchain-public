import mongoose from 'mongoose';

export interface DeletedPostNotificationMetadata {
  authorName: string;
  authorPicture: string | undefined;
  postId: mongoose.Types.ObjectId;
  postBody: string;
  postLink?: string;
  trackId?: mongoose.Types.ObjectId;
}
