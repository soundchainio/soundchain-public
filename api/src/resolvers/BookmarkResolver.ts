import mongoose from 'mongoose';
import { Arg, Authorized, Ctx, FieldResolver, Mutation, Query, Resolver, Root } from 'type-graphql';
import { CurrentUser } from '../decorators/current-user';
import { Bookmark } from '../models/Bookmark';
import { Post } from '../models/Post';
import { User } from '../models/User';
import { Context } from '../types/Context';
import { PageInput } from '../types/PageInput';
import { BookmarkConnection } from '../types/BookmarkConnection';

@Resolver(Bookmark)
export class BookmarkResolver {
  @FieldResolver(() => Post)
  async post(@Ctx() { postService }: Context, @Root() bookmark: Bookmark): Promise<Post> {
    return postService.getPost(bookmark.postId.toString());
  }

  @Query(() => BookmarkConnection)
  @Authorized()
  async myBookmarks(
    @Ctx() { bookmarkService }: Context,
    @CurrentUser() { profileId }: User,
    @Arg('page', { nullable: true }) page?: PageInput,
  ): Promise<BookmarkConnection> {
    return bookmarkService.getBookmarks(profileId.toString(), page);
  }

  @Query(() => Boolean)
  @Authorized()
  async isPostBookmarked(
    @Ctx() { bookmarkService }: Context,
    @CurrentUser() { profileId }: User,
    @Arg('postId') postId: string,
  ): Promise<boolean> {
    return bookmarkService.isBookmarked(profileId, new mongoose.Types.ObjectId(postId));
  }

  @Mutation(() => Bookmark)
  @Authorized()
  async bookmarkPost(
    @Ctx() { bookmarkService }: Context,
    @CurrentUser() { profileId }: User,
    @Arg('postId') postId: string,
  ): Promise<Bookmark> {
    return bookmarkService.createBookmark({
      profileId,
      postId: new mongoose.Types.ObjectId(postId),
    });
  }

  @Mutation(() => Bookmark)
  @Authorized()
  async unbookmarkPost(
    @Ctx() { bookmarkService }: Context,
    @CurrentUser() { profileId }: User,
    @Arg('postId') postId: string,
  ): Promise<Bookmark> {
    return bookmarkService.deleteBookmark({
      profileId,
      postId: new mongoose.Types.ObjectId(postId),
    });
  }

  @Query(() => Number)
  @Authorized()
  async bookmarkCount(
    @Ctx() { bookmarkService }: Context,
    @CurrentUser() { profileId }: User,
  ): Promise<number> {
    return bookmarkService.getBookmarkCount(profileId.toString());
  }
}
