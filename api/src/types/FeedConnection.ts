import { Field, ObjectType } from 'type-graphql';
import { FeedItem } from '../models/FeedItem';
import { PageInfo } from './PageInfo';

@ObjectType()
export class FeedConnection {
  @Field(() => PageInfo)
  pageInfo: PageInfo;

  @Field(() => [FeedItem])
  nodes: FeedItem[];
}
