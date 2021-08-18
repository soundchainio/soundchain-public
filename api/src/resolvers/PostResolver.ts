import { CurrentUser } from 'decorators/current-user';
import { Comment } from 'models/Comment';
import { Post } from 'models/Post';
import { Profile } from 'models/Profile';
import User from 'models/User';
import { CreatePostInput } from 'resolvers/types/CreatePostInput';
import { CreatePostPayload } from 'resolvers/types/CreatePostPayload';
import { CommentService } from 'services/CommentService';
import { PostService } from 'services/PostService';
import { ProfileService } from 'services/ProfileService';
import { Arg, Authorized, FieldResolver, Mutation, Query, Resolver, Root } from 'type-graphql';

@Resolver(Post)
export class PostResolver {
  @FieldResolver(() => Profile)
  profile(@Root() post: Post): Promise<Profile> {
    return ProfileService.getProfile(post.profileId);
  }

  @FieldResolver(() => [Comment])
  comments(@Root() post: Post): Promise<Comment[]> {
    return CommentService.getComments(post._id);
  }

  @FieldResolver(() => Number)
  commentCount(@Root() post: Post): Promise<number> {
    return CommentService.getCommentCount(post._id);
  }

  @Query(() => Post)
  post(@Arg('id') id: string): Promise<Post> {
    return PostService.getPost(id);
  }

  @Query(() => [Post])
  posts(@Arg('profileId', { nullable: true }) profileId: string): Promise<Post[]> {
    return PostService.getPosts({ profileId });
  }

  @Mutation(() => CreatePostPayload)
  @Authorized()
  async createPost(
    @Arg('input') { body, mediaLink }: CreatePostInput,
    @CurrentUser() { profileId }: User,
  ): Promise<CreatePostPayload> {
    const post = await PostService.createPost({ profileId, body, mediaLink });
    return { post };
  }
}
