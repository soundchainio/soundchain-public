import { DocumentType } from '@typegoose/typegoose';
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

  async createReaction(params: NewReactionParams): Promise<Reaction> {
    const reaction = new this.model(params);
    await reaction.save();
    this.dataLoader.clear(this.getKeyFromComponents(reaction));
    return reaction;
  }

  async findReaction(keyComponents: ReactionKeyComponents): Promise<Reaction | null> {
    const key = this.getKeyFromComponents(keyComponents);
    const reaction = await this.dataLoader.load(key);
    return reaction ? reaction : null;
  }
}
