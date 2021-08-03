import { Arg, Authorized, Mutation, Query, Resolver } from 'type-graphql';
import { CurrentUser } from '../middlewares/decorators/current-user';
import Post from '../models/Post';
import User from '../models/User';
import AddPostInput from '../resolvers/types/AddPostInput';
import AddPostPayload from '../resolvers/types/AddPostPayload';
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

  @Mutation(() => AddPostPayload)
  @Authorized()
  async addPost(@Arg('input') { body }: AddPostInput, @CurrentUser() user: User): Promise<AddPostPayload> {
    const post = await PostService.createPost(user.profileId, body);
    return { post };
  }
}
