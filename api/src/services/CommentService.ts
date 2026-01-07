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

    // ⚠️ CRITICAL FIX - DO NOT REMOVE ⚠️
    // Convert to plain object to avoid mongoose Symbol(mongoose#Document#scope) serialization errors
    // Without this, GraphQL tries to serialize internal mongoose properties and fails
    // Bug was fixed multiple times (Dec 2025, Jan 2026) - this MUST stay or comments will break
    // See commits: e295754ab, 40fc241ec, 7feea157d
    return newComment.toObject() as Comment;
  }

  async createGuestComment(params: NewGuestCommentParams): Promise<Comment> {
    const newComment = new CommentModel({
      postId: params.postId,
      body: params.body,
      isGuest: true,
      walletAddress: params.walletAddress,
    });
    await newComment.save();
    // ⚠️ CRITICAL - .toObject() prevents mongoose scope errors - DO NOT REMOVE
    return newComment.toObject() as Comment;
  }

  async updateComment({ commentId, body }: UpdateCommentParams): Promise<Comment> {
    const updatedComment = await CommentModel.findOneAndUpdate(
      { _id: commentId },
      { body },
      { new: true }
    ).lean();

    if (!updatedComment) {
      throw new Error('Comment not found');
    }

    return updatedComment as unknown as Comment;
  }

  async deleteComment(params: DeleteCommentParams): Promise<Comment> {
    const deletedComment = await CommentModel.findOneAndUpdate(
      { _id: params.commentId, profileId: params.profileId },
      { deleted: true },
      { new: true },
    ).lean();

    if (!deletedComment) {
      throw new Error('Comment not found or you do not have permission to delete it');
    }

    return deletedComment as unknown as Comment;
  }

  async deleteCommentByAdmin(params: DeleteCommentParams): Promise<Comment> {
    const deletedComment = await CommentModel.findOneAndUpdate(
      { _id: params.commentId },
      { deleted: true },
      { new: true },
    ).lean();

    if (!deletedComment) {
      throw new Error('Comment not found');
    }

    const post = await PostModel.findById(deletedComment.postId).lean();

    // Only notify if we have valid data
    if (post && deletedComment.profileId) {
      this.context.notificationService.notifyCommentDeletedByAdmin({
        comment: deletedComment as unknown as Comment,
        post: post as any,
        authorProfileId: deletedComment.profileId.toString(),
      });
    }

    return deletedComment as unknown as Comment;
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
