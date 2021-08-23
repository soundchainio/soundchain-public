import { Comment, CommentModel } from '../models/Comment';
import { Context } from '../types/Context';
import { ModelService } from './ModelService';

interface NewCommentParams {
  profileId: string;
  body: string;
  postId: string;
}

export class CommentService extends ModelService<typeof Comment> {
  constructor(context: Context) {
    super(context, CommentModel);
  }

  getComment(id: string): Promise<Comment> {
    return this.findOrFail(id);
  }

  async createComment(params: NewCommentParams): Promise<Comment> {
    const newComment = new CommentModel(params);
    await newComment.save();
    const post = await this.context.postService.getPost(params.postId);
    const profile = await this.context.profileService.getProfile(params.profileId);
    this.context.notificationService.notifyNewCommentOnPost({
      comment: newComment,
      post,
      authorProfile: profile,
    });
    return newComment;
  }

  getComments(postId: string): Promise<Comment[]> {
    return CommentModel.find({ postId }).sort({ createdAt: 'asc' }).exec();
  }

  countComments(postId: string): Promise<number> {
    return CommentModel.countDocuments({ postId }).exec();
  }
}
