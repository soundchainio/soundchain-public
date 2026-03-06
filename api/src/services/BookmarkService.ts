import mongoose from 'mongoose';
import { DocumentType } from '@typegoose/typegoose';
import { UserInputError } from 'apollo-server-express';
import { FilterQuery } from 'mongoose';
import { PaginateResult } from '../db/pagination/paginate';
import { Bookmark, BookmarkModel } from '../models/Bookmark';
import { Context } from '../types/Context';
import { PageInput } from '../types/PageInput';
import { SortOrder } from '../types/SortOrder';
import { ModelService } from './ModelService';

interface BookmarkKeyComponents {
  profileId: mongoose.Types.ObjectId;
  postId: mongoose.Types.ObjectId;
}

export class BookmarkService extends ModelService<typeof Bookmark, BookmarkKeyComponents> {
  constructor(context: Context) {
    super(context, BookmarkModel);
  }

  keyIteratee = ({ profileId, postId }: Partial<DocumentType<Bookmark>>): string => {
    return `${profileId?.toString()}:${postId?.toString()}`;
  };

  getFindConditionForKeys(keys: readonly string[]): FilterQuery<Bookmark> {
    return {
      $or: keys.map(key => {
        const [profileId, postId] = key.split(':');
        return { profileId: new mongoose.Types.ObjectId(profileId), postId: new mongoose.Types.ObjectId(postId) };
      }),
    };
  }

  async createBookmark(params: BookmarkKeyComponents): Promise<Bookmark> {
    // Check if already bookmarked
    const existing = await this.model.findOne(params);
    if (existing) {
      return existing; // Already bookmarked, return existing
    }

    const bookmark = new this.model(params);
    await bookmark.save();
    this.dataLoader.clear(this.getKeyFromComponents(params));
    return bookmark;
  }

  async findBookmark(keyComponents: BookmarkKeyComponents): Promise<Bookmark | null> {
    const key = this.getKeyFromComponents(keyComponents);
    const bookmark = await this.dataLoader.load(key);
    return bookmark ? bookmark : null;
  }

  async deleteBookmark(keyComponents: BookmarkKeyComponents): Promise<Bookmark> {
    const bookmark = await this.model.findOneAndDelete(keyComponents);

    if (!bookmark) {
      throw new UserInputError("Can't delete bookmark because it doesn't exist.");
    }

    this.dataLoader.clear(this.getKeyFromComponents(keyComponents));
    return bookmark;
  }

  async isBookmarked(profileId: mongoose.Types.ObjectId, postId: mongoose.Types.ObjectId): Promise<boolean> {
    const count = await this.model.countDocuments({ profileId, postId });
    return count > 0;
  }

  async getBookmarks(profileId: string, page?: PageInput): Promise<PaginateResult<Bookmark>> {
    return this.paginate({
      filter: { profileId: new mongoose.Types.ObjectId(profileId) },
      page,
      sort: { field: 'createdAt', order: SortOrder.DESC }, // Most recent first
    });
  }

  async getBookmarkCount(profileId: string): Promise<number> {
    return this.model.countDocuments({ profileId: new mongoose.Types.ObjectId(profileId) });
  }
}
