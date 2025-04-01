import mongoose from 'mongoose';
import { UserInputError } from 'apollo-server-express';
import { PaginateResult } from '../db/pagination/paginate';
import { Post, PostModel } from '../models/Post';
import { Context } from '../types/Context';
import { FilterPostInput } from '../types/FilterPostInput';
import { PageInput } from '../types/PageInput';
import { SortPostInput } from '../types/SortPostInput';
import { ModelService } from './ModelService';
import { NewReactionParams } from './ReactionService';

interface NewPostParams {
  profileId: string;
  body?: string;
  mediaLink?: string;
  trackId?: string;
  trackEditionId?: string;
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
    const post = new this.model(params);
    await post.save();
    this.context.feedService.createFeedItem({ profileId: post.profileId, postId: post._id, postedAt: post.createdAt });
    this.context.feedService.addPostToFollowerFeeds(post);
    this.context.notificationService.notifyNewPostForSubscribers(post);
    return post;
  }

  async createRepost(params: RepostParams): Promise<Post> {
    const post = new PostModel(params);
    await post.save();
    this.context.feedService.createFeedItem({ profileId: post.profileId, postId: post._id, postedAt: post.createdAt });
    this.context.feedService.addPostToFollowerFeeds(post);
    return post;
  }

  async deletePost(params: DeletePostParams): Promise<Post> {
    this.context.feedService.deleteItemsByPostId(params.postId);
    return await PostModel.findOneAndUpdate(
      { _id: params.postId, profileId: params.profileId },
      { deleted: true },
      { new: true },
    );
  }

  async deletePostByAdmin(params: DeletePostParams): Promise<Post> {
    this.context.feedService.deleteItemsByPostId(params.postId);
    const deletedPost = await PostModel.findOneAndUpdate({ _id: params.postId }, { deleted: true }, { new: true });
    this.context.notificationService.notifyPostDeletedByAdmin(deletedPost);
    return deletedPost;
  }

  async updatePost(params: UpdatePostParams): Promise<Post> {
    return await this.model.findOneAndUpdate(
      { _id: params.postId, profileId: params.profileId },
      {
        body: params.body,
        mediaLink: params.mediaLink,
      },
      { new: true },
    );
  }

  getPosts(filter?: FilterPostInput, sort?: SortPostInput, page?: PageInput): Promise<PaginateResult<Post>> {
    return this.paginate({ filter: { ...filter, deleted: false }, sort, page });
  }

  getPost(id: string): Promise<Post> {
    return this.findOrFail(id);
  }

  async addReactionToPost({ profileId, postId, type }: NewReactionParams): Promise<Post> {
    const [post, alreadyReacted] = await Promise.all([
      this.findOrFail(postId.toString()),
      this.context.reactionService.exists({ postId, profileId }),
    ]);

    if (alreadyReacted) throw new UserInputError('You already reacted to the post.');

    await this.context.reactionService.createReaction({ postId, profileId, type });
    await this.model.updateOne({ _id: postId }, { $inc: { [`reactionStats.${type}`]: 1 } });
    post.reactionStats[type]++;
    return post;
  }

  async removeReactionFromPost({ profileId, postId }: { profileId: string; postId: string }): Promise<Post> {
    const post = await this.findOrFail(postId);

    const { type } = await this.context.reactionService.deleteReaction({
      postId: new mongoose.Types.ObjectId(postId),
      profileId: new mongoose.Types.ObjectId(profileId),
    });
    await this.model.updateOne(
      { _id: postId, [`reactionStats.${type}`]: { $gt: 0 } },
      { $inc: { [`reactionStats.${type}`]: -1 } },
    );

    if (post.reactionStats[type] > 0) {
      post.reactionStats[type]--;
    }

    return post;
  }

  async changeReactionToPost({ postId, profileId, type: newType }: NewReactionParams): Promise<Post> {
    const post = await this.findOrFail(postId.toString());

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
  }

  countReposts(postId: string): Promise<number> {
    return PostModel.countDocuments({ repostId: postId }).exec();
  }

  async getOriginalFromTrack(trackId: string): Promise<Post> {
    const track = await this.context.trackService.getTrack(trackId);

    const ors: any[] = [{ trackId }];

    if (track.trackEditionId) {
      ors.push({ trackEditionId: track.trackEditionId });
    }

    return this.model
      .findOne({ $or: ors })
      .sort({ createdAt: 1 })
      .exec();
  }
}
