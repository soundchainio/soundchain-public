import Comment, { CommentModel } from '../models/Comment';

export class CommentService {
  static getComment(id: string): Promise<Comment> {
    return CommentModel.findByIdOrFail(id);
  }

  static async createComment(comment: Comment): Promise<Comment> {
    const newComment = new CommentModel(comment);
    await newComment.save();
    return newComment;
  }
}
