import { Arg, Authorized, Mutation, Query, Resolver } from 'type-graphql';
import { CurrentUser } from '../middlewares/decorators/current-user';
import Post from '../models/Post';
import User from '../models/User';
import { CreatePostInput } from '../resolvers/types/CreatePostInput';
import { CreatePostPayload } from '../resolvers/types/CreatePostPayload';
import { PostService } from '../services/PostService';

@Resolver(Post)
export class PostResolver {
  @Query(() => Post)
  post(@Arg('id') id: string): Promise<Post> {
    return PostService.getPost(id);
  }

  @Query(() => [Post])
  posts(): Promise<Post[]> {
    return PostService.getPosts();
  }

  @Mutation(() => CreatePostPayload)
  @Authorized()
  async createPost(@Arg('input') { body }: CreatePostInput, @CurrentUser() user: User): Promise<CreatePostPayload> {
    const post = await PostService.createPost(user.profileId, body);
    return { post };
  }
}
