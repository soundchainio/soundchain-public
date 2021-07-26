import { Arg, Mutation, Query, Resolver } from 'type-graphql';
import Comment, { CommentModel } from '../models/Comment';
import AddCommentInput from './types/AddCommentInput';
import AddCommentPayload from './types/AddCommentPayload';

@Resolver(Comment)
export default class CommentResolver {
  @Query(() => Comment)
  comment(@Arg('id') id: string): Promise<Comment> {
    return CommentModel.findByIdOrFail(id);
  }

  @Query(() => [Comment])
  comments(): Promise<Comment[]> {
    return CommentModel.find().exec();
  }

  @Mutation(() => AddCommentPayload)
  async addComment(@Arg('input') input: AddCommentInput): Promise<AddCommentPayload> {
    const comment = new CommentModel(input);
    await comment.save();
    return { comment };
  }
}
