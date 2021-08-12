import { CurrentUser } from 'decorators/current-user';
import { Comment } from 'models/Comment';
import { Post } from 'models/Post';
import { Profile } from 'models/Profile';
import User from 'models/User';
import { AddCommentInput } from 'resolvers/types/AddCommentInput';
import { AddCommentPayload } from 'resolvers/types/AddCommentPayload';
import { CommentService } from 'services/CommentService';
import { PostService } from 'services/PostService';
import { ProfileService } from 'services/ProfileService';
import { Arg, Authorized, FieldResolver, Mutation, Query, Resolver, Root } from 'type-graphql';

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
    return CommentService.getComments(postId);
  }

  @Mutation(() => AddCommentPayload)
  @Authorized()
  async addComment(
    @Arg('input') input: AddCommentInput,
    @CurrentUser() { profileId }: User,
  ): Promise<AddCommentPayload> {
    const comment = await CommentService.createComment({ profile: profileId, ...input });
    return { comment };
  }
}
