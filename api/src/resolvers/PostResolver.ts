import { Arg, Authorized, FieldResolver, Mutation, Query, Resolver, Root } from 'type-graphql';
import { CurrentUser } from '../decorators/current-user';
import { Comment } from '../models/Comment';
import { Post } from '../models/Post';
import { Profile } from '../models/Profile';
import { User } from '../models/User';
import { CommentService } from '../services/CommentService';
import { PostService } from '../services/PostService';
import { ProfileService } from '../services/ProfileService';
import { CreatePostInput } from '../types/CreatePostInput';
import { CreatePostPayload } from '../types/CreatePostPayload';
import { FilterPostInput } from '../types/FilterPostInput';
import { PageInput } from '../types/PageInput';
import { PostConnection } from '../types/PostConnection';
import { SortPostInput } from '../types/SortPostInput';

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
    return CommentService.countComments(post._id);
  }

  @Query(() => Post)
  post(@Arg('id') id: string): Promise<Post> {
    return PostService.getPost(id);
  }

  @Query(() => PostConnection)
  posts(
    @Arg('filter', { nullable: true }) filter?: FilterPostInput,
    @Arg('sort', { nullable: true }) sort?: SortPostInput,
    @Arg('page', { nullable: true }) page?: PageInput,
  ): Promise<PostConnection> {
    return PostService.getPosts(filter, sort, page);
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
