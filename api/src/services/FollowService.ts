import { DocumentType } from '@typegoose/typegoose';
import { UserInputError } from 'apollo-server-express';
import { FilterQuery } from 'mongoose';
import { Follow, FollowModel } from '../models/Follow';
import { Context } from '../types/Context';
import { ModelService } from './ModelService';

interface FollowKeyComponents {
  followerId: string;
  followedId: string;
}

export class FollowService extends ModelService<typeof Follow, FollowKeyComponents> {
  constructor(context: Context) {
    super(context, FollowModel);
  }

  keyIteratee = ({ followerId, followedId }: Partial<DocumentType<InstanceType<typeof Follow>>>): string => {
    return `${followerId}:${followedId}`;
  };

  getFindConditionForKeys(keys: readonly string[]): FilterQuery<Follow> {
    return {
      $or: keys.map(key => {
        const [followerId, followedId] = key.split(':');
        return { followerId, followedId };
      }),
    };
  }

  async createFollow(followerId: string, followedId: string): Promise<Follow> {
    const follow = new FollowModel({ followerId, followedId });
    await follow.save();
    this.dataLoader.clear(this.getKeyFromComponents(follow));
    return follow;
  }

  async deleteFollow(followerId: string, followedId: string): Promise<void> {
    const { deletedCount } = await FollowModel.deleteOne({ followerId, followedId });

    if (deletedCount === 0) {
      throw new UserInputError(`User profile ${followerId} isn't following profile ${followerId}.`);
    }

    this.dataLoader.clear(this.getKeyFromComponents({ followerId, followedId }));
  }

  async getFollowerIds(profileId: string): Promise<string[]> {
    const rest = await this.model.find({ followedId: profileId }, { followerId: 1, _id: 0 });
    return rest.map(({ followerId }) => followerId);
  }
}
