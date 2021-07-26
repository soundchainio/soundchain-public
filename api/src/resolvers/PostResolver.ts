import { Arg, Mutation, Query, Resolver } from 'type-graphql';
import Post from '../models/Post';
import AddPostInput from '../resolvers/types/AddPostInput';
import AddPostPayload from '../resolvers/types/AddPostPayload';
import { createPost, findPost, listPosts } from '../services/PostService';

@Resolver(Post)
export default class PostResolver {
  @Query(() => Post)
  async post(@Arg('id') id: string): Promise<Post> {
    return await findPost(id);
  }

  @Query(() => [Post])
  async posts(): Promise<Post[]> {
    const posts = await listPosts();
    return posts;
  }

  @Mutation(() => AddPostPayload)
  async createPost(@Arg('input') { author, body }: AddPostInput): Promise<AddPostPayload> {
    const post = await createPost(author, body);
    return { post };
  }
}
