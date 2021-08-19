import { Post } from 'models/Post';
import { Field, ObjectType } from 'type-graphql';
import { PageInfo } from './PageInfo';

@ObjectType()
export class PostConnection {
  @Field()
  pageInfo: PageInfo;

  @Field(() => [Post])
  nodes: Post[];
}
