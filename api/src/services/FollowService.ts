import { Follow, FollowModel } from 'models/Follow';

interface FollowRelationship {
  followerId: string;
  followedId: string;
}

type NewFollowParams = FollowRelationship;
type DeleteFollowConditions = FollowRelationship;
type FollowExistsFilter = FollowRelationship;

export class FollowService {
  static async createFollow(params: NewFollowParams): Promise<Follow> {
    const newFollow = new FollowModel(params);
    await newFollow.save();
    return newFollow;
  }

  static async deleteFollow(conditions: DeleteFollowConditions): Promise<void> {
    await FollowModel.deleteOne(conditions);
  }

  static followExists(filter: FollowExistsFilter): Promise<boolean> {
    return FollowModel.exists(filter);
  }

  static countFollowers(followedId: string): Promise<number> {
    return FollowModel.countDocuments({ followedId }).exec();
  }

  static countFollowing(followerId: string): Promise<number> {
    return FollowModel.countDocuments({ followerId }).exec();
  }
}
