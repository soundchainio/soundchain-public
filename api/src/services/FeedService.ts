import mongoose from 'mongoose';
import { PaginateResult } from '../db/pagination/paginate';
import { FeedItem, FeedItemModel } from '../models/FeedItem';
import { Follow } from '../models/Follow';
import { Post } from '../models/Post';
import { Context } from '../types/Context';
import { PageInput } from '../types/PageInput';
import { SortOrder } from '../types/SortOrder';
import { SortPostField } from '../types/SortPostField';
import { ModelService } from './ModelService';

export class FeedService extends ModelService<typeof FeedItem> {
  constructor(context: Context) {
    super(context, FeedItemModel);
  }

  getFeed(profileId: string, page: PageInput): Promise<PaginateResult<FeedItem>> {
    return this.paginate({ filter: { profileId }, sort: { field: 'postedAt', order: SortOrder.DESC }, page });
  }

  async addPostToFollowerFeeds(post: Post): Promise<void> {
    const followerIds = await this.context.followService.getFollowerIds(post.profileId.toString());
    const feedItems = followerIds.map(
      profileId => new this.model({ profileId, postId: post._id, postedAt: post.createdAt }),
    );
    await this.model.insertMany(feedItems);
  }

  async addRecentPostsToFollowerFeed({ followerId, followedId }: Follow): Promise<void> {
    const { nodes: posts } = await this.context.postService.getPosts(
      { profileId: followedId.toString() },
      { field: SortPostField.CREATED_AT, order: SortOrder.DESC },
      { first: 20 },
    );

    const feedItems = posts.map(
      post => new this.model({ profileId: followerId, postId: post._id, postedAt: post.createdAt }),
    );

    try {
      await this.model.insertMany(feedItems, { ordered: false });
    } catch (error) {
      // ignore duplicates error
    }
  }

  async seedNewProfileFeed(profileId: string): Promise<void> {
    const { nodes: posts } = await this.context.postService.getPosts(
      {},
      { field: SortPostField.CREATED_AT, order: SortOrder.DESC },
      { first: 50 },
    );

    const feedItems = posts.map(post => new this.model({ profileId, postId: post._id, postedAt: post.createdAt }));
    await this.model.insertMany(feedItems);
  }

  async createFeedItem(item: Pick<FeedItem, 'profileId' | 'postId' | 'postedAt'>): Promise<void> {
    const feedItem = new FeedItemModel(item);
    await feedItem.save();
  }

  async deleteItemsByPostId(postId: string): Promise<void> {
    await this.model.deleteMany({ postId });
  }
}
