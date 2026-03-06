import { Field, ObjectType } from 'type-graphql';
import { Bookmark } from '../models/Bookmark';
import { PageInfo } from './PageInfo';

@ObjectType()
export class BookmarkConnection {
  @Field()
  pageInfo: PageInfo;

  @Field(() => [Bookmark])
  nodes: Bookmark[];
}
