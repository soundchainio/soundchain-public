import { Arg, Authorized, Ctx, FieldResolver, Mutation, Query, Resolver, Root } from 'type-graphql';
import { CurrentUser } from '../middlewares/decorators/current-user';
import { Comment } from '../models/Comment';
import Post from '../models/Post';
import { Profile } from '../models/Profile';
import User from '../models/User';
import { CommentService } from '../services/CommentService';
import { PostService } from '../services/PostService';
import { ProfileService } from '../services/ProfileService';
import { AddCommentInput } from './types/AddCommentInput';
import { AddCommentPayload } from './types/AddCommentPayload';

@Resolver(Comment)
export class CommentResolver {
  @FieldResolver(() => Post)
  post(@Root() comment: Comment): Promise<Post> {
    return PostService.getPost(comment.post);
  }

  @FieldResolver(() => Profile)
  profile(@Root() comment: Comment): Promise<Profile> {
    return ProfileService.getProfile(comment.profile);
  }

  @Query(() => Comment)
  comment(@Arg('id') id: string): Promise<Comment> {
    return CommentService.getComment(id);
  }

  @Query(() => [Comment])
  comments(@Arg('postId') postId: string): Promise<Comment[]> {
    console.log(postId);
    return CommentService.getComments(postId);
  }

  @Mutation(() => AddCommentPayload)
  @Authorized()
  async addComment(
    @Arg('input') input: AddCommentInput,
    @Ctx() @CurrentUser() { profileId }: User,
  ): Promise<AddCommentPayload> {
    const comment = await CommentService.createComment({ profile: profileId, ...input });
    return { comment };
  }
}
