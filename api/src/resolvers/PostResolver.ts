import { toPairs } from 'lodash';
import { Arg, Authorized, Ctx, FieldResolver, Mutation, Query, Resolver, Root } from 'type-graphql';
import { CurrentUser } from '../decorators/current-user';
import { Comment } from '../models/Comment';
import { Post } from '../models/Post';
import { Profile } from '../models/Profile';
import { User } from '../models/User';
import { ChangeReactionInput } from '../types/ChangeReactionInput';
import { ChangeReactionPayload } from '../types/ChangeReactionPayload';
import { Context } from '../types/Context';
import { CreatePostInput } from '../types/CreatePostInput';
import { CreatePostPayload } from '../types/CreatePostPayload';
import { CreateRepostInput } from '../types/CreateRepostInput';
import { CreateRepostPayload } from '../types/CreateRepostPayload';
import { FilterPostInput } from '../types/FilterPostInput';
import { PageInput } from '../types/PageInput';
import { PostConnection } from '../types/PostConnection';
import { ReactionType } from '../types/ReactionType';
import { ReactToPostInput } from '../types/ReactToPostInput';
import { ReactToPostPayload } from '../types/ReactToPostPayload';
import { RetractReactionInput } from '../types/RetractReactionInput';
import { RetractReactionPayload } from '../types/RetractReactionPayload';
import { SortPostInput } from '../types/SortPostInput';

@Resolver(Post)
export class PostResolver {
  @FieldResolver(() => Profile)
  profile(@Ctx() { profileService }: Context, @Root() post: Post): Promise<Profile> {
    return profileService.getProfile(post.profileId);
  }

  @FieldResolver(() => [Comment])
  comments(@Ctx() { commentService }: Context, @Root() post: Post): Promise<Comment[]> {
    return commentService.getComments(post._id);
  }

  @FieldResolver(() => Number)
  commentCount(@Ctx() { commentService }: Context, @Root() post: Post): Promise<number> {
    return commentService.countComments(post._id);
  }

  @FieldResolver(() => Number)
  repostCount(@Ctx() { postService }: Context, @Root() post: Post): Promise<number> {
    return postService.countReposts(post._id);
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
    @Arg('input') { body, mediaLink }: CreatePostInput,
    @CurrentUser() { profileId }: User,
  ): Promise<CreatePostPayload> {
    const post = await postService.createPost({ profileId, body, mediaLink });
    return { post };
  }

  @Mutation(() => ReactToPostPayload)
  @Authorized()
  async reactToPost(
    @Ctx() { postService }: Context,
    @Arg('input') input: ReactToPostInput,
    @CurrentUser() { profileId }: User,
  ): Promise<ReactToPostPayload> {
    const post = await postService.addReactionToPost({ ...input, profileId });
    return { post };
  }

  @Mutation(() => RetractReactionPayload)
  @Authorized()
  async retractReaction(
    @Ctx() { postService }: Context,
    @Arg('input') { postId }: RetractReactionInput,
    @CurrentUser() { profileId }: User,
  ): Promise<RetractReactionPayload> {
    const post = await postService.removeReactionFromPost({ postId, profileId });
    return { post };
  }

  @Mutation(() => ChangeReactionPayload)
  @Authorized()
  async changeReaction(
    @Ctx() { postService }: Context,
    @Arg('input') input: ChangeReactionInput,
    @CurrentUser() { profileId }: User,
  ): Promise<ChangeReactionPayload> {
    const post = await postService.changeReactionToPost({ profileId, ...input });
    return { post };
  }

  @Mutation(() => CreateRepostPayload)
  @Authorized()
  async createRepost(
    @Ctx() { postService }: Context,
    @Arg('input') { body, repostId }: CreateRepostInput,
    @CurrentUser() { profileId }: User,
  ): Promise<CreateRepostPayload> {
    const post = await postService.createRepost({ profileId, body, repostId });
    const originalPost = await postService.getPost(repostId)
    return { post, originalPost };
  }
}
