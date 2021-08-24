import { DocumentType } from '@typegoose/typegoose';
import { UserInputError } from 'apollo-server-express';
import { sortBy } from 'lodash';
import { FilterQuery } from 'mongoose';
import { Reaction, ReactionModel } from '../models/Reaction';
import { Context } from '../types/Context';
import { ModelService } from './ModelService';

interface ReactionKeyComponents {
  profileId: string;
  postId: string;
}

export interface NewReactionParams {
  profileId: string;
  postId: string;
  emoji: string;
}

export class ReactionService extends ModelService<typeof Reaction, ReactionKeyComponents> {
  constructor(context: Context) {
    super(context, ReactionModel);
  }

  keyIteratee = ({ profileId, postId }: Partial<DocumentType<InstanceType<typeof Reaction>>>): string => {
    return `${profileId}:${postId}`;
  };

  getFindConditionForKeys(keys: readonly string[]): FilterQuery<Reaction> {
    return {
      $or: keys.map(key => {
        const [profileId, postId] = key.split(':');
        return { profileId, postId };
      }),
    };
  }

  async createReaction({ profileId, postId, emoji }: NewReactionParams): Promise<Reaction> {
    const reaction = new ReactionModel({ profileId, postId, emoji });
    await reaction.save();
    this.dataLoader.clear(this.getKeyFromComponents(reaction));
    return reaction;
  }

  async deleteReaction(profileId: string, postId: string): Promise<void> {
    const { deletedCount } = await ReactionModel.deleteOne({ profileId, postId });

    if (deletedCount === 0) {
      throw new UserInputError(`User profile ${profileId} hasn't reacted to post ${postId}.`);
    }

    this.dataLoader.clear(this.getKeyFromComponents({ profileId, postId }));
  }

  async getTopReactions(postId: string): Promise<string[]> {
    const aggregate = await this.model
      .aggregate()
      .match({ postId })
      .group({ _id: '$emoji', count: { $sum: 1 } });

    return sortBy(aggregate, 'count')
      .reverse()
      .map(({ _id: emoji }) => emoji);
  }
}
