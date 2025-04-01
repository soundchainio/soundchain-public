import mongoose from 'mongoose';
import { Arg, Authorized, Ctx, FieldResolver, Mutation, Query, Resolver, Root } from 'type-graphql';
import { CurrentUser } from '../decorators/current-user';
import { Comment } from '../models/Comment';
import { Post } from '../models/Post';
import { Profile } from '../models/Profile';
import { User } from '../models/User';
import { AddCommentInput } from '../types/AddCommentInput';
import { AddCommentPayload } from '../types/AddCommentPayload';
import { CommentConnection } from '../types/CommentConnection';
import { Context } from '../types/Context';
import { DeleteCommentInput } from '../types/DeleteCommentInput';
import { DeleteCommentPayload } from '../types/DeleteCommentPayload';
import { PageInput } from '../types/PageInput';
import { Role } from '../types/Role';
import { UpdateCommentInput } from '../types/UpdateCommentInput';
import { UpdateCommentPayload } from '../types/UpdateCommentPayload';

@Resolver(Comment)
export class CommentResolver {
  @FieldResolver(() => Post)
  post(@Ctx() { postService }: Context, @Root() comment: Comment): Promise<Post> {
    return postService.getPost(comment.postId.toString());
  }

  @FieldResolver(() => Profile)
  profile(@Ctx() { profileService }: Context, @Root() comment: Comment): Promise<Profile> {
    return profileService.getProfile(comment.profileId.toString());
  }

  @Query(() => Comment)
  comment(@Ctx() { commentService }: Context, @Arg('id') id: string): Promise<Comment> {
    return commentService.getComment(id);
  }

  @Mutation(() => AddCommentPayload)
  @Authorized()
  async addComment(
    @Ctx() { commentService }: Context,
    @Arg('input') input: AddCommentInput,
    @CurrentUser() { profileId }: User,
  ): Promise<AddCommentPayload> {
    const comment = await commentService.createComment({
      profileId,
      postId: new mongoose.Types.ObjectId(input.postId),
      body: input.body,
    });
    return { comment };
  }

  @Mutation(() => UpdateCommentPayload)
  @Authorized()
  async updateComment(
    @Ctx() { commentService }: Context,
    @Arg('input') input: UpdateCommentInput,
  ): Promise<UpdateCommentPayload> {
    const comment = await commentService.updateComment({
      commentId: new mongoose.Types.ObjectId(input.commentId),
      body: input.body,
    });
    return { comment };
  }

  @Mutation(() => DeleteCommentPayload)
  @Authorized()
  async deleteComment(
    @Ctx() { commentService }: Context,
    @Arg('input') input: DeleteCommentInput,
    @CurrentUser() { profileId, roles }: User,
  ): Promise<DeleteCommentPayload> {
    const isAdmin = roles.includes(Role.ADMIN) || roles.includes(Role.TEAM_MEMBER);
    if (isAdmin) {
      const comment = await commentService.deleteCommentByAdmin({
        profileId,
        commentId: new mongoose.Types.ObjectId(input.commentId),
      });
      return { comment };
    }
    const comment = await commentService.deleteComment({
      profileId,
      commentId: new mongoose.Types.ObjectId(input.commentId),
    });
    return { comment };
  }

  @Query(() => CommentConnection)
  comments(
    @Ctx() { commentService }: Context,
    @Arg('page', { nullable: true }) page: PageInput,
    @Arg('postId', { nullable: true }) postId: string,
  ): Promise<CommentConnection> {
    return commentService.getComments(postId, page);
  }
}
