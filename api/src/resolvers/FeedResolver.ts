import { Arg, Authorized, Ctx, FieldResolver, Query, Resolver, Root } from 'type-graphql';
import { CurrentUser } from '../decorators/current-user';
import { FeedItem } from '../models/FeedItem';
import { Post } from '../models/Post';
import { User } from '../models/User';
import { Context } from '../types/Context';
import { FeedConnection } from '../types/FeedConnection';
import { PageInput } from '../types/PageInput';

@Resolver(FeedItem)
export class FeedResolver {
  @FieldResolver(() => Post)
  post(@Ctx() { postService }: Context, @Root() { postId }: FeedItem): Promise<Post> {
    return postService.getPost(postId.toString());
  }

  @Query(() => FeedConnection)
  @Authorized()
  feed(
    @Ctx() { feedService }: Context,
    @Arg('page', { nullable: true }) page: PageInput,
    @CurrentUser() { profileId }: User,
  ): Promise<FeedConnection> {
    return feedService.getFeed(profileId.toString(), page);
  }
}
