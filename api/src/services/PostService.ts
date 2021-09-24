import * as Sentry from '@sentry/node';
import { UserInputError } from 'apollo-server-express';
import { PaginateResult } from '../db/pagination/paginate';
import { NotFoundError } from '../errors/NotFoundError';
import { Post, PostModel } from '../models/Post';
import { Context } from '../types/Context';
import { FilterPostInput } from '../types/FilterPostInput';
import { PageInput } from '../types/PageInput';
import { SortPostInput } from '../types/SortPostInput';
import { ModelService } from './ModelService';
import { NewReactionParams } from './ReactionService';

interface NewPostParams {
  profileId: string;
  body: string;
  mediaLink?: string;
}

interface RepostParams {
  profileId: string;
  body: string;
  repostId: string;
}

interface UpdatePostParams {
  profileId: string;
  postId: string;
  body: string;
  mediaLink?: string;
}

interface DeletePostParams {
  profileId: string;
  postId: string;
}

export class PostService extends ModelService<typeof Post> {
  constructor(context: Context) {
    super(context, PostModel);
  }

  async createPost(params: NewPostParams): Promise<Post> {
    try {
      const post = new this.model(params);
      await post.save();
      this.context.feedService.createFeedItem({ profileId: post.profileId, postId: post._id, postedAt: post.createdAt })
      this.context.feedService.addPostToFollowerFeeds(post);
      this.context.notificationService.notifyNewPostForSubscribers(post);
      return post;
    } catch (e) {
      Sentry.captureException(e);
    }
  }

  async createRepost(params: RepostParams): Promise<Post> {
    try {
      const post = new PostModel(params);
      await post.save();
      this.context.feedService.createFeedItem({ profileId: post.profileId, postId: post._id, postedAt: post.createdAt })
      this.context.feedService.addPostToFollowerFeeds(post);
      return post;
    } catch (e) {
      Sentry.captureException(e);
    }
  }

  async deletePost(params: DeletePostParams): Promise<Post> {
    try {
      const post = await this.findOrFail(params.postId);
      if (post.profileId !== params.profileId) {
        throw new Error(`Error while deleting a post: The user trying to delete is not the author of the post.`);
      }
      await PostModel.deleteOne(post);
      this.context.feedService.deleteItemsByPostId(params.postId);
      return post;
    } catch (e) {
      Sentry.captureException(e);
    }
  }

  async updatePost(params: UpdatePostParams): Promise<Post> {
    try {
      const validationPost = await this.findOrFail(params.postId);

      if (validationPost.profileId !== params.profileId) {
        throw new Error(`You are not the author of the post.`);
      }

      const updatedPost = await this.model.findByIdAndUpdate(
        { _id: params.postId },
        {
          body: params.body,
          mediaLink: params.mediaLink
        },
        { new: true }
      );

      if (!updatedPost) {
        throw new NotFoundError('Post ', params.postId);
      }
      return updatedPost;
    } catch (e) {
      Sentry.captureException(e);
    }
  }

  getPosts(filter?: FilterPostInput, sort?: SortPostInput, page?: PageInput): Promise<PaginateResult<Post>> {
    try {
      return this.paginate({ filter, sort, page });
    } catch (e) {
      Sentry.captureException(e);
    }
  }

  getPost(id: string): Promise<Post> {
    try {
      return this.findOrFail(id);
    } catch (e) {
      Sentry.captureException(e);
    }
  }

  async addReactionToPost({ profileId, postId, type }: NewReactionParams): Promise<Post> {
    try {
      const [post, alreadyReacted] = await Promise.all([
        this.findOrFail(postId),
        this.context.reactionService.exists({ postId, profileId }),
      ]);

      if (alreadyReacted) throw new UserInputError('You already reacted to the post.');

      await this.context.reactionService.createReaction({ postId, profileId, type });
      await this.model.updateOne({ _id: postId }, { $inc: { [`reactionStats.${type}`]: 1 } });
      post.reactionStats[type]++;
      return post;
    } catch (e) {
      Sentry.captureException(e);
    }
  }

  async removeReactionFromPost({ profileId, postId }: { profileId: string; postId: string }): Promise<Post> {
    try {
      const post = await this.findOrFail(postId);

      const { type } = await this.context.reactionService.deleteReaction({ postId, profileId });
      await this.model.updateOne(
        { _id: postId, [`reactionStats.${type}`]: { $gt: 0 } },
        { $inc: { [`reactionStats.${type}`]: -1 } },
      );

      if (post.reactionStats[type] > 0) {
        post.reactionStats[type]--;
      }

      return post;
    } catch (e) {
      Sentry.captureException(e);
    }
  }

  async changeReactionToPost({ postId, profileId, type: newType }: NewReactionParams): Promise<Post> {
    try {
      const post = await this.findOrFail(postId);

      const { type: oldType } = await this.context.reactionService.updateReaction({ postId, profileId, type: newType });

      await this.model.updateOne(
        { _id: postId, [`reactionStats.${oldType}`]: { $gt: 0 } },
        { $inc: { [`reactionStats.${oldType}`]: -1, [`reactionStats.${newType}`]: 1 } },
      );

      if (post.reactionStats[oldType] > 0) {
        post.reactionStats[oldType]--;
      }

      post.reactionStats[newType]++;
      return post;
    } catch (e) {
      Sentry.captureException(e);
    }
  }

  countReposts(postId: string): Promise<number> {
    try {
      return PostModel.countDocuments({ repostId: postId }).exec();
    } catch (e) {
      Sentry.captureException(e);
    }
  }
}
