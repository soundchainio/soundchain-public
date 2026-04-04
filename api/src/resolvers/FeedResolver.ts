import { Arg, Authorized, Ctx, FieldResolver, Query, Resolver, Root } from 'type-graphql';
import { CurrentUser } from '../decorators/current-user';
import { FeedItem } from '../models/FeedItem';
import { Post } from '../models/Post';
import { User } from '../models/User';
import { Context } from '../types/Context';
import { FeedConnection } from '../types/FeedConnection';
import { PageInput } from '../types/PageInput';

// Per-request post cache — prevents N+1 queries within a single GraphQL request
// Each Lambda invocation gets a fresh cache (no stale data across requests)
const postCacheMap = new WeakMap<Context, Map<string, Post | null>>();

function getPostCache(ctx: Context): Map<string, Post | null> {
  if (!postCacheMap.has(ctx)) {
    postCacheMap.set(ctx, new Map());
  }
  return postCacheMap.get(ctx)!;
}

@Resolver(FeedItem)
export class FeedResolver {
  @FieldResolver(() => Post)
  async post(@Ctx() ctx: Context, @Root() { postId }: FeedItem): Promise<Post> {
    const cache = getPostCache(ctx);
    const id = postId.toString();

    // Return cached if available
    if (cache.has(id)) {
      return cache.get(id) as Post;
    }

    // Single post fetch (fallback) — still used when cache miss
    const post = await ctx.postService.getPost(id);
    cache.set(id, post);
    return post;
  }

  @Query(() => FeedConnection)
  @Authorized()
  async feed(
    @Ctx() ctx: Context,
    @Arg('page', { nullable: true }) page: PageInput,
    @CurrentUser() { profileId }: User,
  ): Promise<FeedConnection> {
    const result = await ctx.feedService.getFeed(profileId.toString(), page);

    // Pre-load ALL posts in one batch query — eliminates N+1
    if (result.nodes.length > 0) {
      const postIds = result.nodes.map(item => item.postId.toString());
      const postsMap = await ctx.postService.getPostsByIds(postIds);
      const cache = getPostCache(ctx);
      for (const [id, post] of postsMap) {
        cache.set(id, post);
      }
    }

    return result;
  }
}
