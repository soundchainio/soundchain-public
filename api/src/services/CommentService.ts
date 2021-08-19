import { Comment, CommentModel } from 'models/Comment';
import { NotificationService } from './NotificationService';
import { PostService } from './PostService';
import { ProfileService } from './ProfileService';

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
    const post = await PostService.getPost(params.postId);
    const profile = await ProfileService.getProfile(params.profileId);
    NotificationService.notifyNewCommentOnPost({
      comment: newComment,
      post,
      authorProfile: profile,
    });
    return newComment;
  }

  static getComments(postId: string): Promise<Comment[]> {
    return CommentModel.find({ postId }).sort({ createdAt: 'asc' }).exec();
  }

  static getCommentCount(postId: string): Promise<number> {
    return CommentModel.countDocuments({ postId }).exec();
  }
}
