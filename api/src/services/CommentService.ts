import { Comment, CommentModel } from 'models/Comment';
import { NotificationService } from './NotificationService';

interface NewCommentParams {
  profileId: string;
  body: string;
  postId: string;
}

export class CommentService {
  static getComment(id: string): Promise<Comment> {
    return CommentModel.findByIdOrFail(id);
  }

  static async createComment(params: NewCommentParams): Promise<Comment> {
    const newComment = new CommentModel(params);
    await newComment.save();
    NotificationService.notifyNewCommentOnPost({ commentId: newComment.id, postId: newComment.postId });
    return newComment;
  }

  static getComments(postId: string): Promise<Comment[]> {
    return CommentModel.find({ postId }).sort({ createdAt: 'asc' }).exec();
  }

  static getCommentCount(postId: string): Promise<number> {
    return CommentModel.countDocuments({ postId }).exec();
  }
}
