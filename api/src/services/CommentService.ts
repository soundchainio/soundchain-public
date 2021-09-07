import { Comment, CommentModel } from '../models/Comment';
import { Context } from '../types/Context';
import { ModelService } from './ModelService';
import { PageInput } from '../types/PageInput';
import { PaginateResult } from '../db/pagination/paginate';
import { SortOrder } from '../types/SortOrder';

interface NewCommentParams {
  profileId: string;
  body: string;
  postId: string;
}

interface DeleteCommentParams {
  profileId: string;
  commentId: string;
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
    const [post] = await Promise.all([this.context.postService.getPost(params.postId), newComment.save()]);
    if (newComment.profileId !== post.profileId) {
      this.context.notificationService.notifyNewCommentOnPost({
        comment: newComment,
        post,
        authorProfileId: params.profileId,
      });
    }
    return newComment;
  }

  async deleteComment(params: DeleteCommentParams): Promise<Comment> {
    const comment = await this.findOrFail(params.commentId);
    if (comment.profileId !== params.profileId) {
      throw new Error(`Error while deleting a comment: The user trying to delete is not the author of the comment.`);
    }
    await CommentModel.deleteOne(comment);
    return comment;
  }

  getComments(postId: string): Promise<Comment[]> {
    return CommentModel.find({ postId }).sort({ createdAt: 'asc' }).exec();
  }

  countComments(postId: string): Promise<number> {
    return CommentModel.countDocuments({ postId }).exec();
  }

  getPaginatedComments(postId: string, page: PageInput): Promise<PaginateResult<Comment>> {
    return this.paginate({ filter: { postId }, sort: { field: 'createdAt', order: SortOrder.DESC }, page });
  }
}
