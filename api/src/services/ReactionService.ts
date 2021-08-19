import { UserInputError } from 'apollo-server-express';
import { Reaction, ReactionEmoji, ReactionModel } from 'models/Reaction';
import { ReactionCount } from 'resolvers/types/ReactionCount';

interface NewReactionParams {
  profileId: string;
  postId: string;
  emoji: ReactionEmoji;
}

interface DeleteReactionConditions {
  profileId: string;
  postId: string;
}

export class ReactionService {
  static async createReaction(params: NewReactionParams): Promise<Reaction> {
    const newReaction = new ReactionModel(params);
    await newReaction.save();
    return newReaction;
  }

  static async deleteReaction(conditions: DeleteReactionConditions): Promise<Reaction> {
    const reaction = await ReactionModel.findOneAndDelete(conditions);
    if (!reaction) throw new UserInputError('Failed to delete because reaction does not exist.');
    return reaction;
  }

  static async getReactionCounts(postId: string): Promise<ReactionCount[]> {
    return ReactionModel.aggregate([
      {
        $match: { postId },
        $group: { _id: '$emoji', count: { $sum: 1 } },
      },
    ])
      .exec()
      .map(({ _id: emoji, count }: { _id: ReactionEmoji; count: number }) => ({ emoji, count }));
  }
}
