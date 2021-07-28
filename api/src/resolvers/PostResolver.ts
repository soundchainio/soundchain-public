import { Arg, Mutation, Query, Resolver } from 'type-graphql';
import Post from '../models/Post';
import AddPostInput from '../resolvers/types/AddPostInput';
import AddPostPayload from '../resolvers/types/AddPostPayload';
import { PostService } from '../services/PostService';

@Resolver(Post)
export default class PostResolver {
  @Query(() => Post)
  post(@Arg('id') id: string): Promise<Post> {
    return PostService.getPost(id);
  }

  @Query(() => [Post])
  posts(): Promise<Post[]> {
    return PostService.getPosts();
  }

  @Mutation(() => AddPostPayload)
  async addPost(@Arg('input') { profileId, body }: AddPostInput): Promise<AddPostPayload> {
    const post = await PostService.createPost(profileId, body);
    return { post };
  }
}
