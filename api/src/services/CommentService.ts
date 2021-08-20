import { Comment, CommentModel } from 'models/Comment';

interface NewCommentParams {
  profileId: string;
  body: string;
}

export class CommentService {
  static getComment(id: string): Promise<Comment> {
    return CommentModel.findByIdOrFail(id);
  }

  static async createComment(params: NewCommentParams): Promise<Comment> {
    const newComment = new CommentModel(params);
    await newComment.save();
    return newComment;
  }

  static getComments(postId: string): Promise<Comment[]> {
    return CommentModel.find({ postId }).sort({ createdAt: 'asc' }).exec();
  }

  static countComments(postId: string): Promise<number> {
    return CommentModel.countDocuments({ postId }).exec();
  }
}
