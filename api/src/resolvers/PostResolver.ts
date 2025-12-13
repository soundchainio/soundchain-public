import mongoose from 'mongoose';
import { toPairs } from 'lodash';
import { Arg, Authorized, Ctx, FieldResolver, Mutation, Query, Resolver, Root } from 'type-graphql';
import { PaginateResult } from '../db/pagination/paginate';
import { CurrentUser } from '../decorators/current-user';
import { Comment } from '../models/Comment';
import { Post } from '../models/Post';
import { Profile } from '../models/Profile';
import { Track } from '../models/Track';
import { User } from '../models/User';
import { ChangeReactionInput } from '../types/ChangeReactionInput';
import { ChangeReactionPayload } from '../types/ChangeReactionPayload';
import { Context } from '../types/Context';
import { CreatePostInput } from '../types/CreatePostInput';
import { CreatePostPayload } from '../types/CreatePostPayload';
import { CreateRepostInput } from '../types/CreateRepostInput';
import { CreateRepostPayload } from '../types/CreateRepostPayload';
import { DeletePostInput } from '../types/DeletePostInput';
import { DeletePostPayload } from '../types/DeletePostPayload';
import { FilterPostInput } from '../types/FilterPostInput';
import { PageInput } from '../types/PageInput';
import { PostConnection } from '../types/PostConnection';
import { ReactionConnection } from '../types/ReactionConnection';
import { ReactionType } from '../types/ReactionType';
import { ReactToPostInput } from '../types/ReactToPostInput';
import { ReactToPostPayload } from '../types/ReactToPostPayload';
import { RetractReactionInput } from '../types/RetractReactionInput';
import { RetractReactionPayload } from '../types/RetractReactionPayload';
import { Role } from '../types/Role';
import { SortPostInput } from '../types/SortPostInput';
import { UpdatePostInput } from '../types/UpdatePostInput';
import { UpdatePostPayload } from '../types/UpdatePostPayload';

@Resolver(Post)
export class PostResolver {
  @FieldResolver(() => Profile, { nullable: true })
  async profile(@Ctx() { profileService }: Context, @Root() post: Post): Promise<Profile | null> {
    try {
      const profile = await profileService.getProfile(post.profileId.toString());
      return profile || null;
    } catch (error) {
      console.error(`Failed to load profile ${post.profileId} for post ${post._id}:`, error);
      return null;
    }
  }

  @FieldResolver(() => [Comment])
  comments(@Ctx() { commentService }: Context, @Root() post: Post): Promise<PaginateResult<Comment>> {
    return commentService.getComments(post._id.toString());
  }

  @FieldResolver(() => Number)
  commentCount(@Ctx() { commentService }: Context, @Root() post: Post): Promise<number> {
    return commentService.countComments(post._id.toString());
  }

  @FieldResolver(() => Number)
  repostCount(@Ctx() { postService }: Context, @Root() post: Post): Promise<number> {
    return postService.countReposts(post._id.toString());
  }

  @FieldResolver(() => Number)
  totalReactions(@Root() { reactionStats }: Post): number {
    return Object.values(reactionStats).reduce((acc, value) => acc + value, 0);
  }

  @FieldResolver(() => [ReactionType])
  topReactions(@Root() { reactionStats }: Post, @Arg('top') top: number): ReactionType[] {
    return toPairs(reactionStats)
      .filter(pair => pair[1] !== 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, top)
      .map(pair => pair[0] as ReactionType);
  }

  @FieldResolver(() => ReactionType, { nullable: true })
  async myReaction(
    @Ctx() { reactionService }: Context,
    @Root() { _id: postId }: Post,
    @CurrentUser() user?: User,
  ): Promise<ReactionType | null> {
    if (!user) return null;
    const reaction = await reactionService.findReaction({ postId, profileId: user.profileId });
    return reaction ? reaction.type : null;
  }

  @FieldResolver(() => Track, { nullable: true })
  async track(@Ctx() { trackService }: Context, @Root() { trackId, trackEditionId }: Post): Promise<Track | null> {
    if (!trackId) return null;
    return trackService.getTrackFromEdition(trackId.toString(), trackEditionId?.toString());
  }

  @Query(() => Post)
  post(@Ctx() { postService }: Context, @Arg('id') id: string): Promise<Post> {
    return postService.getPost(id);
  }

  @Query(() => PostConnection)
  posts(
    @Ctx() { postService }: Context,
    @Arg('filter', { nullable: true }) filter?: FilterPostInput,
    @Arg('sort', { nullable: true }) sort?: SortPostInput,
    @Arg('page', { nullable: true }) page?: PageInput,
  ): Promise<PostConnection> {
    return postService.getPosts(filter, sort, page);
  }

  @Mutation(() => CreatePostPayload)
  @Authorized()
  async createPost(
    @Ctx() { postService }: Context,
    @Arg('input') { body, mediaLink, trackId, trackEditionId }: CreatePostInput,
    @CurrentUser() { profileId }: User,
  ): Promise<CreatePostPayload> {
    const post = await postService.createPost({ profileId: profileId.toString(), body, mediaLink, trackId, trackEditionId });
    return { post };
  }

  @Mutation(() => UpdatePostPayload)
  @Authorized()
  async updatePost(
    @Ctx() { postService }: Context,
    @Arg('input') { body, mediaLink, postId }: UpdatePostInput,
    @CurrentUser() { profileId }: User,
  ): Promise<UpdatePostPayload> {
    const post = await postService.updatePost({ postId, body, mediaLink, profileId: profileId.toString() });
    return { post };
  }

  @Mutation(() => ReactToPostPayload)
  @Authorized()
  async reactToPost(
    @Ctx() { postService }: Context,
    @Arg('input') input: ReactToPostInput,
    @CurrentUser() { profileId }: User,
  ): Promise<ReactToPostPayload> {
    const post = await postService.addReactionToPost({
      ...input,
      postId: new mongoose.Types.ObjectId(input.postId),
      profileId,
    });
    return { post };
  }

  @Mutation(() => RetractReactionPayload)
  @Authorized()
  async retractReaction(
    @Ctx() { postService }: Context,
    @Arg('input') { postId }: RetractReactionInput,
    @CurrentUser() { profileId }: User,
  ): Promise<RetractReactionPayload> {
    const post = await postService.removeReactionFromPost({ postId, profileId: profileId.toString() });
    return { post };
  }

  @Mutation(() => ChangeReactionPayload)
  @Authorized()
  async changeReaction(
    @Ctx() { postService }: Context,
    @Arg('input') input: ChangeReactionInput,
    @CurrentUser() { profileId }: User,
  ): Promise<ChangeReactionPayload> {
    const post = await postService.changeReactionToPost({
      ...input,
      postId: new mongoose.Types.ObjectId(input.postId),
      profileId,
    });
    return { post };
  }

  @Mutation(() => CreateRepostPayload)
  @Authorized()
  async createRepost(
    @Ctx() { postService }: Context,
    @Arg('input') { body, repostId }: CreateRepostInput,
    @CurrentUser() { profileId }: User,
  ): Promise<CreateRepostPayload> {
    const post = await postService.createRepost({ profileId: profileId.toString(), body, repostId });
    const originalPost = await postService.getPost(repostId);
    return { post, originalPost };
  }

  @Mutation(() => DeletePostPayload)
  @Authorized()
  async deletePost(
    @Ctx() { postService }: Context,
    @Arg('input') input: DeletePostInput,
    @CurrentUser() { profileId, roles }: User,
  ): Promise<DeletePostPayload> {
    const isAdmin = roles.includes(Role.ADMIN) || roles.includes(Role.TEAM_MEMBER);

    if (isAdmin) {
      const post = await postService.deletePostByAdmin({ profileId: profileId.toString(), ...input });
      return { post };
    }

    const post = await postService.deletePost({ profileId: profileId.toString(), ...input });
    return { post };
  }

  @Query(() => ReactionConnection)
  reactions(
    @Ctx() { reactionService }: Context,
    @Arg('postId') postId: string,
    @Arg('page', { nullable: true }) page?: PageInput,
  ): Promise<ReactionConnection> {
    return reactionService.getReactions(postId, page);
  }

  @Query(() => String)
  bandcampLink(@Ctx() { embedService }: Context, @Arg('url') url: string): Promise<string> {
    return embedService.bandcampLink(url);
  }

  @Query(() => Post)
  async getOriginalPostFromTrack(@Ctx() { postService }: Context, @Arg('trackId') trackId: string): Promise<Post> {
    return postService.getOriginalFromTrack(trackId);
  }

  // ============================================
  // GUEST ACCESS MUTATIONS (wallet-only, no account required)
  // These allow users to interact without signing up
  // ============================================

  @Mutation(() => ReactToPostPayload)
  async guestReactToPost(
    @Ctx() { postService }: Context,
    @Arg('input') input: ReactToPostInput,
    @Arg('walletAddress') walletAddress: string,
  ): Promise<ReactToPostPayload> {
    // Validate wallet address format
    if (!walletAddress || !/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      throw new Error('Invalid wallet address');
    }

    const post = await postService.addGuestReactionToPost({
      ...input,
      postId: new mongoose.Types.ObjectId(input.postId),
      walletAddress: walletAddress.toLowerCase(),
    });
    return { post };
  }

  @Mutation(() => RetractReactionPayload)
  async guestRetractReaction(
    @Ctx() { postService }: Context,
    @Arg('postId') postId: string,
    @Arg('walletAddress') walletAddress: string,
  ): Promise<RetractReactionPayload> {
    if (!walletAddress || !/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      throw new Error('Invalid wallet address');
    }

    const post = await postService.removeGuestReactionFromPost({
      postId,
      walletAddress: walletAddress.toLowerCase()
    });
    return { post };
  }

  @Mutation(() => CreatePostPayload)
  async guestCreatePost(
    @Ctx() { postService }: Context,
    @Arg('input') { body, mediaLink }: CreatePostInput,
    @Arg('walletAddress') walletAddress: string,
  ): Promise<CreatePostPayload> {
    if (!walletAddress || !/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      throw new Error('Invalid wallet address');
    }

    const post = await postService.createGuestPost({
      walletAddress: walletAddress.toLowerCase(),
      body,
      mediaLink,
    });
    return { post };
  }

  @Mutation(() => DeletePostPayload)
  async guestDeletePost(
    @Ctx() { postService }: Context,
    @Arg('postId') postId: string,
    @Arg('walletAddress') walletAddress: string,
  ): Promise<DeletePostPayload> {
    if (!walletAddress || !/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      throw new Error('Invalid wallet address');
    }

    const post = await postService.deleteGuestPost({
      postId,
      walletAddress: walletAddress.toLowerCase(),
    });
    return { post };
  }
}
