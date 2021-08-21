import { Arg, Authorized, Ctx, FieldResolver, Mutation, Query, Resolver, Root } from 'type-graphql';
import { CurrentUser } from '../decorators/current-user';
import { Comment } from '../models/Comment';
import { Post } from '../models/Post';
import { Profile } from '../models/Profile';
import { User } from '../models/User';
import { AddCommentInput } from '../types/AddCommentInput';
import { AddCommentPayload } from '../types/AddCommentPayload';
import { Context } from '../types/Context';

@Resolver(Comment)
export class CommentResolver {
  @FieldResolver(() => Post)
  post(@Ctx() { postService }: Context, @Root() comment: Comment): Promise<Post> {
    return postService.getPost(comment.postId);
  }

  @FieldResolver(() => Profile)
  profile(@Ctx() { profileService }: Context, @Root() comment: Comment): Promise<Profile> {
    return profileService.getProfile(comment.profileId);
  }

  @Query(() => Comment)
  comment(@Ctx() { commentService }: Context, @Arg('id') id: string): Promise<Comment> {
    return commentService.getComment(id);
  }

  @Query(() => [Comment])
  comments(@Ctx() { commentService }: Context, @Arg('postId') postId: string): Promise<Comment[]> {
    return commentService.getComments(postId);
  }

  @Mutation(() => AddCommentPayload)
  @Authorized()
  async addComment(
    @Ctx() { commentService }: Context,
    @Arg('input') input: AddCommentInput,
    @CurrentUser() { profileId }: User,
  ): Promise<AddCommentPayload> {
    const comment = await commentService.createComment({ profileId, ...input });
    return { comment };
  }
}
