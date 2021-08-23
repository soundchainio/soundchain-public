import { UserInputError } from 'apollo-server-express';
import { PaginateResult } from '../db/pagination/paginate';
import { Post, PostModel } from '../models/Post';
import { ReactionModel } from '../models/Reaction';
import { FilterPostInput } from '../types/FilterPostInput';
import { PageInput } from '../types/PageInput';
import { ReactionEmoji } from '../types/ReactionEmoji';
import { SortPostInput } from '../types/SortPostInput';

interface NewPostParams {
  profileId: string;
  body: string;
  mediaLink?: string;
}

export class PostService {
  static async createPost(params: NewPostParams): Promise<Post> {
    const post = new PostModel(params);
    await post.save();
    return post;
  }

  static getPosts(filter?: FilterPostInput, sort?: SortPostInput, page?: PageInput): Promise<PaginateResult<Post>> {
    return PostModel.paginate({ filter, sort, page });
  }

  static getPost(id: string): Promise<Post> {
    return PostModel.findByIdOrFail(id);
  }

  static async reactToPost(postId: string, profileId: string, emoji: ReactionEmoji): Promise<Profile> {
    const post = await PostModel.findByIdOrFail(postId);

    const alreadyReacted = await ReactionModel.exists({ postId, profileId });
    if (alreadyReacted) throw new UserInputError('You already reacted to the post.');

    await new ReactionModel({ postId, profileId, emoji }).save();

    return post;
  }

  // static async undoReaction(conditions: DeleteReactionConditions): Promise<Profile> {
  //   const reaction = await ReactionModel.findOneAndDelete(conditions);
  //   if (!reaction) throw new UserInputError('Failed to delete because reaction does not exist.');
  //   return reaction;
  // }
}
