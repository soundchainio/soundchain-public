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

  async reactToPost({ profileId, postId, emoji }: NewReactionParams): Promise<Post> {
    const [post, alreadyReacted] = await Promise.all([
      this.findOrFail(postId),
      this.context.reactionService.exists({ postId, profileId }),
    ]);

    if (alreadyReacted) throw new UserInputError('You already reacted to the post.');

    await this.context.reactionService.createReaction({ postId, profileId, emoji });
    post.reactionStats = this.incrementReactionStats(post, emoji, 1);
    await this.model.updateOne({ _id: postId }, { reactionStats: post.reactionStats });
    return post;
  }

  private incrementReactionStats({ reactionStats }: Post, emoji: string, inc: 1 | -1) {
    const emojiStats = reactionStats.find(stats => stats.emoji === emoji);
    if (!emojiStats) {
      if (inc === -1) throw new Error('No reaction to decrement.');
      return [...reactionStats, { emoji, count: 1 }];
    }

    if (emojiStats.count + inc < 1) {
      return reactionStats.filter(stats => stats.emoji !== emoji);
    }

    return reactionStats.map(stats => (stats.emoji === emoji ? { ...stats, count: stats.count + inc } : stats));
  }
}
