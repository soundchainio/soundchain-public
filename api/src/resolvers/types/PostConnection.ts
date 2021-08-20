import { Field, ObjectType } from 'type-graphql';
import { Post } from '../../models/Post';
import { PageInfo } from './PageInfo';

@ObjectType()
export class PostConnection {
  @Field()
  pageInfo: PageInfo;

  @Field(() => [Post])
  nodes: Post[];
}
