import { Field, ObjectType } from 'type-graphql';
import { Comment } from '../models/Comment';
import { PageInfo } from './PageInfo';

@ObjectType()
export class CommentsConnection {
  @Field()
  pageInfo: PageInfo;

  @Field(() => [Comment])
  nodes: Comment[];
}
