import { PaginateResult } from '../db/pagination/paginate';
import { FeedItem, FeedItemModel } from '../models/FeedItem';
import { Post } from '../models/Post';
import { Context } from '../types/Context';
import { PageInput } from '../types/PageInput';
import { ModelService } from './ModelService';

export class FeedService extends ModelService<typeof FeedItem> {
  constructor(context: Context) {
    super(context, FeedItemModel);
  }

  getFeed(profileId: string, page: PageInput): Promise<PaginateResult<FeedItem>> {
    return this.paginate({ filter: { profileId }, sort: { field: 'postId' }, page });
  }

  async addPostToFollowerFeeds(post: Post): Promise<void> {
    const followerIds = await this.context.followService.getFollowerIds(post.profileId);
    const feedItems = followerIds.map(profileId => new FeedItemModel({ profileId, postId: post._id }));
    await FeedItemModel.insertMany(feedItems);
  }
}
