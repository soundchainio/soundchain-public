import { Arg, Mutation, Query, Resolver } from 'type-graphql';
import Post, { PostModel } from '../models/Post';
import {createPost} from "../services/PostService"
import AddPostInput from '../resolvers/types/AddPostInput';
import AddPostPayload from '../resolvers/types/AddPostPayload';

@Resolver(Post)
export default class PostResolver {
  @Query(() => Post)
  post(@Arg('id') id: string): Promise<Post> {
    return PostModel.findByIdOrFail(id);
  }

  @Query(() => [Post])
  posts(): Promise<Post[]> {
    return PostModel.find().sort({ createdAt: 'desc' }).exec();
  }

  @Mutation(() => AddPostPayload)
  async createPost(@Arg('input') { author, body }: AddPostInput): Promise<AddPostPayload> {
    const post = await createPost(author, body);
    return { post };
  }
}
