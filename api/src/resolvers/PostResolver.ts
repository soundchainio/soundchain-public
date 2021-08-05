import { Arg, Authorized, FieldResolver, Mutation, Query, Resolver, Root } from 'type-graphql';
import { CurrentUser } from '../middlewares/decorators/current-user';
import Post from '../models/Post';
import { Profile } from '../models/Profile';
import User from '../models/User';
import { CreatePostInput } from '../resolvers/types/CreatePostInput';
import { CreatePostPayload } from '../resolvers/types/CreatePostPayload';
import { PostService } from '../services/PostService';
import { ProfileService } from '../services/ProfileService';

@Resolver(Post)
export class PostResolver {
  @FieldResolver(() => Profile)
  async profile(@Root() post: Post): Promise<Profile> {
    return ProfileService.getProfile(post.profileId);
  }

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
