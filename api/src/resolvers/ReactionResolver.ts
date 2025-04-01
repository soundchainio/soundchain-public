import { Arg, Ctx, FieldResolver, Query, Resolver, Root } from 'type-graphql';
import { Profile } from '../models/Profile';
import { Reaction } from '../models/Reaction';
import { Context } from '../types/Context';
import { PageInput } from '../types/PageInput';
import { ReactionConnection } from '../types/ReactionConnection';

@Resolver(Reaction)
export class ReactionResolver {
  @FieldResolver(() => Profile)
  profile(@Ctx() { profileService }: Context, @Root() reaction: Reaction): Promise<Profile> {
    return profileService.getProfile(reaction.profileId.toString());
  }

  @Query(() => ReactionConnection)
  reactions(
    @Ctx() { reactionService }: Context,
    @Arg('postId') postId: string,
    @Arg('page', { nullable: true }) page?: PageInput,
  ): Promise<ReactionConnection> {
    return reactionService.getReactions(postId, page);
  }
}
