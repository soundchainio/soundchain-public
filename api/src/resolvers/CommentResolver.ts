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
  @FieldResolver(() => Post, { nullable: true })
  async post(@Ctx() { postService }: Context, @Root() comment: Comment): Promise<Post | null> {
    // Defensive null check to prevent mongoose scope errors
    if (!comment || !comment.postId) {
      console.warn('[CommentResolver] post() - Missing comment or postId');
      return null;
    }
    try {
      // Safely convert postId to string, handling both ObjectId and string types
      const postIdString = typeof comment.postId === 'string'
        ? comment.postId
        : comment.postId.toString();
      return await postService.getPost(postIdString);
    } catch (err) {
      console.error('[CommentResolver] Error fetching post:', err);
      return null;
    }
  }

  @FieldResolver(() => Profile, { nullable: true })
  async profile(@Ctx() { profileService }: Context, @Root() comment: Comment): Promise<Profile | null> {
    // Defensive null check + guest comments don't have a profile
    if (!comment || comment.isGuest || !comment.profileId) {
      return null;
    }
    try {
      // Safely convert profileId to string, handling both ObjectId and string types
      const profileIdString = typeof comment.profileId === 'string'
        ? comment.profileId
        : comment.profileId.toString();
      return await profileService.getProfile(profileIdString);
    } catch (err) {
      console.error('[CommentResolver] Error fetching profile:', err);
      return null;
    }
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
    @CurrentUser() user: User,
  ): Promise<AddCommentPayload> {
    // Validate user has a profile before creating comment
    if (!user || !user.profileId) {
      throw new Error('User profile not found. Please complete your profile setup.');
    }

    const comment = await commentService.createComment({
      profileId: user.profileId,
      postId: new mongoose.Types.ObjectId(input.postId),
      body: input.body,
    });
    return { comment };
  }

  @Mutation(() => AddCommentPayload)
  async guestAddComment(
    @Ctx() { commentService }: Context,
    @Arg('input') input: AddCommentInput,
    @Arg('walletAddress') walletAddress: string,
  ): Promise<AddCommentPayload> {
    // Validate wallet address format
    if (!walletAddress || !/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      throw new Error('Invalid wallet address');
    }

    const comment = await commentService.createGuestComment({
      walletAddress: walletAddress.toLowerCase(),
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
