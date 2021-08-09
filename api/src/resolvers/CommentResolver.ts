import { Arg, Ctx, FieldResolver, Mutation, Query, Resolver, Root } from 'type-graphql';
import { Comment } from '../models/Comment';
import { Profile } from '../models/Profile';
import { CommentService } from '../services/CommentService';
import { ProfileService } from '../services/ProfileService';
import Context from '../types/Context';
import AddCommentInput from './types/AddCommentInput';
import AddCommentPayload from './types/AddCommentPayload';

@Resolver(Comment)
export class CommentResolver {
  @FieldResolver(() => Profile)
  async profile(@Root() comment: Comment): Promise<Profile> {
    return ProfileService.getProfile(comment.profile as string);
  }

  @Query(() => Comment)
  comment(@Arg('id') id: string): Promise<Comment> {
    return CommentService.getComment(id);
  }

  @Mutation(() => AddCommentPayload)
  async addComment(@Arg('input') input: AddCommentInput, @Ctx() context: Context): Promise<AddCommentPayload> {
    const user = await context.user;
    const comment = await CommentService.createComment({ profile: user?.profileId, ...input });
    return { comment };
  }
}
