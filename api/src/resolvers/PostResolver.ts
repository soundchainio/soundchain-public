import { Arg, Mutation, Query, Resolver } from 'type-graphql';
import Post, { PostModel } from '../models/Post';
import AddPostInput from '../resolvers/types/AddPostInput';
import AddPostPayload from '../resolvers/types/AddPostPayload';
import { createPost, listPosts } from '../services/PostService';

@Resolver(Post)
export default class PostResolver {
  @Query(() => Post)
  post(@Arg('id') id: string): Promise<Post> {
    return PostModel.findByIdOrFail(id);
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
