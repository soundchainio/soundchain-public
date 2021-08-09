import { Arg, Authorized, FieldResolver, Mutation, Query, Resolver, Root } from 'type-graphql';
import { CurrentUser } from '../middlewares/decorators/current-user';
import { Comment } from '../models/Comment';
import Post from '../models/Post';
import { Profile } from '../models/Profile';
import User from '../models/User';
import { CreatePostInput } from '../resolvers/types/CreatePostInput';
import { CreatePostPayload } from '../resolvers/types/CreatePostPayload';
import { CommentService } from '../services/CommentService';
import { PostService } from '../services/PostService';
import { ProfileService } from '../services/ProfileService';

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

  @Query(() => Post)
  post(@Arg('id') id: string): Promise<Post> {
    return PostService.getPost(id);
  }

  @Query(() => [Post])
  posts(
    @Arg('limit', { nullable: true, defaultValue: 50 }) limit: number,
    @Arg('skip', { nullable: true, defaultValue: 0 }) skip: number,
  ): Promise<Post[]> {
    return PostService.getPosts(limit, skip);
  }

  @Mutation(() => CreatePostPayload)
  @Authorized()
  async createPost(@Arg('input') { body }: CreatePostInput, @CurrentUser() user: User): Promise<CreatePostPayload> {
    const post = await PostService.createPost(user.profileId, body);
    return { post };
  }
}
