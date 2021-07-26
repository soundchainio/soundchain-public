import { Arg, Mutation, Query, Resolver } from 'type-graphql';
import Post from '../models/Post';
import AddPostInput from '../resolvers/types/AddPostInput';
import AddPostPayload from '../resolvers/types/AddPostPayload';
import { PostProfile } from '../services/PostService';

@Resolver(Post)
export default class PostResolver {
  @Query(() => Post)
  async post(@Arg('id') id: string): Promise<Post> {
    return await PostProfile.findPost(id);
  }

  @Query(() => [Post])
  async posts(): Promise<Post[]> {
    return await PostProfile.listPosts();
  }

  @Mutation(() => AddPostPayload)
  async createPost(@Arg('input') { author, body }: AddPostInput): Promise<AddPostPayload> {
    const post = await PostProfile.createPost(author, body);
    return { post };
  }
}
