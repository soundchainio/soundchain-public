import { CurrentUser } from 'decorators/current-user';
import { Post } from 'models/Post';
import { Profile } from 'models/Profile';
import { Reaction } from 'models/Reaction';
import User from 'models/User';
import { PostService } from 'services/PostService';
import { ProfileService } from 'services/ProfileService';
import { ReactionService } from 'services/ReactionService';
import { Arg, Authorized, FieldResolver, Mutation, Resolver, Root } from 'type-graphql';
import { ReactToPostInput } from './types/ReactToPostInput';
import { ReactToPostPayload } from './types/ReactToPostPayload';
import { UndoPostReactionInput } from './types/UndoPostReactionInput';
import { UndoPostReactionPayload } from './types/UndoPostReactionPayload';

@Resolver(Reaction)
export class ReactionResolver {
  @FieldResolver(() => Post)
  post(@Root() reaction: Reaction): Promise<Post> {
    return PostService.getPost(reaction.postId);
  }

  @FieldResolver(() => Profile)
  profile(@Root() reaction: Reaction): Promise<Profile> {
    return ProfileService.getProfile(reaction.profileId);
  }

  @Mutation(() => ReactToPostPayload)
  @Authorized()
  async reactToPost(
    @Arg('input') input: ReactToPostInput,
    @CurrentUser() { profileId }: User,
  ): Promise<ReactToPostPayload> {
    const reaction = await ReactionService.createReaction({ profileId, ...input });
    return { reaction };
  }

  @Mutation(() => UndoPostReactionPayload)
  @Authorized()
  async undoPostReaction(
    @Arg('input') input: UndoPostReactionInput,
    @CurrentUser() { profileId }: User,
  ): Promise<UndoPostReactionPayload> {
    const reaction = await ReactionService.deleteReaction({ profileId, ...input });
    return { reaction };
  }
}
