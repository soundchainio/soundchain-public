import mongoose from 'mongoose';

export interface NewPostNotificationMetadata {
  authorName: string;
  authorPicture: string | undefined;
  postId: mongoose.Types.ObjectId;
  postBody: string;
  postLink?: string;
  trackId?: mongoose.Types.ObjectId;
}
