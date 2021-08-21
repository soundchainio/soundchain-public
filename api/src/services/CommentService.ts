import { Comment, CommentModel } from '../models/Comment';
import { Service } from './Service';

interface NewCommentParams {
  profileId: string;
  body: string;
}

export class CommentService extends Service {
  getComment(id: string): Promise<Comment> {
    return CommentModel.findByIdOrFail(id);
  }

  async createComment(params: NewCommentParams): Promise<Comment> {
    const newComment = new CommentModel(params);
    await newComment.save();
    return newComment;
  }

  getComments(postId: string): Promise<Comment[]> {
    return CommentModel.find({ postId }).sort({ createdAt: 'asc' }).exec();
  }

  countComments(postId: string): Promise<number> {
    return CommentModel.countDocuments({ postId }).exec();
  }
}
