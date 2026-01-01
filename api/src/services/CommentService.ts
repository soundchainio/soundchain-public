import mongoose from 'mongoose';
import { PaginateResult } from '../db/pagination/paginate';
import { Comment, CommentModel } from '../models/Comment';
import { PostModel } from '../models/Post';
import { Context } from '../types/Context';
import { PageInput } from '../types/PageInput';
import { SortOrder } from '../types/SortOrder';
import { ModelService } from './ModelService';

interface NewCommentParams {
  profileId: mongoose.Types.ObjectId;
  body: string;
  postId: mongoose.Types.ObjectId;
}

interface NewGuestCommentParams {
  walletAddress: string;
  body: string;
  postId: mongoose.Types.ObjectId;
}

interface DeleteCommentParams {
  profileId: mongoose.Types.ObjectId;
  commentId: mongoose.Types.ObjectId;
}

interface UpdateCommentParams {
  body: string;
  commentId: mongoose.Types.ObjectId;
}

export class CommentService extends ModelService<typeof Comment> {
  constructor(context: Context) {
    super(context, CommentModel);
  }

  getComment(id: string): Promise<Comment> {
    return this.findOrFail(id);
  }

  async createComment(params: NewCommentParams): Promise<Comment> {
    // First verify the post exists
    const post = await this.context.postService.getPost(params.postId.toString());
    if (!post) {
      throw new Error('Post not found');
    }

    const newComment = new CommentModel(params);
    await newComment.save();

    // Only notify if commenter is not the post author
    // Wrap in try-catch to prevent notification errors from breaking comment creation
    if (newComment.profileId && post.profileId && newComment.profileId.toString() !== post.profileId.toString()) {
      try {
        await this.context.notificationService.notifyNewCommentOnPost({
          comment: newComment,
          post,
          authorProfileId: params.profileId.toString(),
        });
      } catch (notifyError) {
        console.error('[CommentService] Failed to send notification, but comment was created:', notifyError);
      }
    }
    return newComment;
  }

  async createGuestComment(params: NewGuestCommentParams): Promise<Comment> {
    const newComment = new CommentModel({
      postId: params.postId,
      body: params.body,
      isGuest: true,
      walletAddress: params.walletAddress,
    });
    await newComment.save();
    return newComment;
  }

  async updateComment({ commentId, body }: UpdateCommentParams): Promise<Comment> {
    const updatedComment = await CommentModel.findOneAndUpdate(
      { _id: commentId },
      { body },
      { new: true }
    );

    if (!updatedComment) {
      throw new Error('Comment not found');
    }

    return updatedComment;
  }

  async deleteComment(params: DeleteCommentParams): Promise<Comment> {
    const deletedComment = await CommentModel.findOneAndUpdate(
      { _id: params.commentId, profileId: params.profileId },
      { deleted: true },
      { new: true },
    );

    if (!deletedComment) {
      throw new Error('Comment not found or you do not have permission to delete it');
    }

    return deletedComment;
  }

  async deleteCommentByAdmin(params: DeleteCommentParams): Promise<Comment> {
    const deletedComment = await CommentModel.findOneAndUpdate(
      { _id: params.commentId },
      { deleted: true },
      { new: true },
    );

    if (!deletedComment) {
      throw new Error('Comment not found');
    }

    const post = await PostModel.findById(deletedComment.postId);

    // Only notify if we have valid data
    if (post && deletedComment.profileId) {
      this.context.notificationService.notifyCommentDeletedByAdmin({
        comment: deletedComment,
        post: post,
        authorProfileId: deletedComment.profileId.toString(),
      });
    }

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
