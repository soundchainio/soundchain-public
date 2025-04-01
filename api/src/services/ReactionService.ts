import mongoose from 'mongoose';
import { DocumentType } from '@typegoose/typegoose';
import { UserInputError } from 'apollo-server-express';
import { FilterQuery } from 'mongoose';
import { PaginateResult } from '../db/pagination/paginate';
import { Reaction, ReactionModel } from '../models/Reaction';
import { Context } from '../types/Context';
import { PageInput } from '../types/PageInput';
import { ReactionType } from '../types/ReactionType';
import { ModelService } from './ModelService';

interface ReactionKeyComponents {
  profileId: mongoose.Types.ObjectId;
  postId: mongoose.Types.ObjectId;
}

export interface NewReactionParams extends ReactionKeyComponents {
  type: ReactionType;
}

interface UpdateReactionParams extends NewReactionParams {
  returnNew?: boolean;
}

export class ReactionService extends ModelService<typeof Reaction, ReactionKeyComponents> {
  constructor(context: Context) {
    super(context, ReactionModel);
  }

  keyIteratee = ({ profileId, postId }: Partial<DocumentType<Reaction>>): string => {
    return `${profileId.toString()}:${postId.toString()}`;
  };

  getFindConditionForKeys(keys: readonly string[]): FilterQuery<Reaction> {
    return {
      $or: keys.map(key => {
        const [profileId, postId] = key.split(':');
        return { profileId: new mongoose.Types.ObjectId(profileId), postId: new mongoose.Types.ObjectId(postId) };
      }),
    };
  }

  async createReaction(params: NewReactionParams): Promise<Reaction> {
    const reaction = new this.model(params);
    await reaction.save();
    this.dataLoader.clear(this.getKeyFromComponents(reaction));
    this.context.notificationService.notifyNewReaction(reaction);
    return reaction;
  }

  async findReaction(keyComponents: ReactionKeyComponents): Promise<Reaction | null> {
    const key = this.getKeyFromComponents(keyComponents);
    const reaction = await this.dataLoader.load(key);
    return reaction ? reaction : null;
  }

  async deleteReaction(keyComponents: ReactionKeyComponents): Promise<Reaction> {
    const reaction = await this.model.findOneAndDelete(keyComponents);

    if (!reaction) {
      throw new UserInputError("Can't delete reaction because it doesn't exist.");
    }

    this.dataLoader.clear(this.getKeyFromComponents(keyComponents));
    return reaction;
  }

  async updateReaction({ postId, profileId, type, returnNew }: UpdateReactionParams): Promise<Reaction> {
    const reaction = await this.model.findOneAndUpdate({ postId, profileId }, { type }, { new: Boolean(returnNew) });

    if (!reaction) {
      throw new UserInputError("Can't update reaction because it doesn't exist.");
    }

    const key = this.getKeyFromComponents({ postId, profileId });
    this.dataLoader.clear(key);

    return reaction;
  }

  async getReactions(postId: string, page?: PageInput): Promise<PaginateResult<Reaction>> {
    return this.paginate({ filter: { postId }, page });
  }
}
