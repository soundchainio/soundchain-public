import { UserInputError } from 'apollo-server-express';
import { PaginateResult } from '../db/pagination/paginate';
import { Post, PostModel } from '../models/Post';
import { Context } from '../types/Context';
import { FilterPostInput } from '../types/FilterPostInput';
import { PageInput } from '../types/PageInput';
import { ReactionType } from '../types/ReactionType';
import { SortPostInput } from '../types/SortPostInput';
import { ModelService } from './ModelService';
import { NewReactionParams } from './ReactionService';

interface NewPostParams {
  profileId: string;
  body: string;
  mediaLink?: string;
}

export class PostService extends ModelService<typeof Post> {
  constructor(context: Context) {
    super(context, PostModel);
  }

  async createPost(params: NewPostParams): Promise<Post> {
    const post = new this.model(params);
    await post.save();
    return post;
  }

  getPosts(filter?: FilterPostInput, sort?: SortPostInput, page?: PageInput): Promise<PaginateResult<Post>> {
    return this.paginate({ filter, sort, page });
  }

  getPost(id: string): Promise<Post> {
    return this.findOrFail(id);
  }

  async reactToPost({ profileId, postId, type }: NewReactionParams): Promise<Post> {
    const [post, alreadyReacted] = await Promise.all([
      this.findOrFail(postId),
      this.context.reactionService.exists({ postId, profileId }),
    ]);

    if (alreadyReacted) throw new UserInputError('You already reacted to the post.');

    await this.context.reactionService.createReaction({ postId, profileId, type });
    post.reactionStats = this.incrementReactionStats(post, type, 1);
    await this.model.updateOne({ _id: postId }, { reactionStats: post.reactionStats });
    return post;
  }

  private incrementReactionStats({ reactionStats }: Post, type: ReactionType, inc: 1 | -1) {
    const typeStats = reactionStats.find(stats => stats.type === type);
    if (!typeStats) {
      if (inc === -1) throw new Error('No reaction to decrement.');
      return [...reactionStats, { type, count: 1 }];
    }

    if (typeStats.count + inc < 1) {
      return reactionStats.filter(stats => stats.type !== type);
    }

    return reactionStats.map(stats => (stats.type === type ? { ...stats, count: stats.count + inc } : stats));
  }
}
