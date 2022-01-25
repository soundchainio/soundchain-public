import { PaginateResult } from '../db/pagination/paginate';
import { Comment, CommentModel } from '../models/Comment';
import { PostModel } from '../models/Post';
import { Context } from '../types/Context';
import { PageInput } from '../types/PageInput';
import { SortOrder } from '../types/SortOrder';
import { ModelService } from './ModelService';

interface NewCommentParams {
  profileId: string;
  body: string;
  postId: string;
}

interface DeleteCommentParams {
  profileId: string;
  commentId: string;
}

interface UpdateCommentParams {
  body: string;
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
    if (!newComment.profileId.equals(post.profileId)) {
      this.context.notificationService.notifyNewCommentOnPost({
        comment: newComment,
        post,
        authorProfileId: params.profileId,
      });
    }
    return newComment;
  }

  async updateComment({ commentId, body }: UpdateCommentParams): Promise<Comment> {
    return await CommentModel.findOneAndUpdate({ _id: commentId }, { body }, { new: true });
  }

  async deleteComment(params: DeleteCommentParams): Promise<Comment> {
    return await CommentModel.findOneAndUpdate(
      { _id: params.commentId, profileId: params.profileId },
      { deleted: true },
      { new: true },
    );
  }

  async deleteCommentByAdmin(params: DeleteCommentParams): Promise<Comment> {
    const deletedComment = await CommentModel.findOneAndUpdate(
      { _id: params.commentId },
      { deleted: true },
      { new: true },
    );

    const post = await PostModel.findById({ _id: deletedComment.postId });

    this.context.notificationService.notifyCommentDeletedByAdmin({
      comment: deletedComment,
      post: post,
      authorProfileId: deletedComment.profileId.toString(),
    });

    return deletedComment;
  }

  countComments(postId: string): Promise<number> {
    return CommentModel.countDocuments({ postId, deleted: false }).exec();
  }

  getComments(postId: string, page?: PageInput): Promise<PaginateResult<Comment>> {
    return this.paginate({
      filter: { postId, deleted: false },
      sort: { field: 'createdAt', order: SortOrder.DESC },
      page,
    });
  }
}
