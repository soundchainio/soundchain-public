import { Arg, Mutation, Query, Resolver } from 'type-graphql';
import Post, { PostModel } from '../models/Post';
import AddPostInput from './types/AddPostInput';
import AddPostPayload from './types/AddPostPayload';

@Resolver(Post)
export default class PostResolver {
  @Query(() => Post)
  post(@Arg('id') id: string): Promise<Post> {
    return PostModel.findByIdOrFail(id);
  }

  @Query(() => [Post])
  posts(): Promise<Post[]> {
    return PostModel.find().exec();
  }

  @Mutation(() => AddPostPayload)
  async addPost(@Arg('input') input: AddPostInput): Promise<AddPostPayload> {
    const post = new PostModel(input as Post);
    await post.save();
    return { post };
  }
}
