import { Field, ObjectType } from 'type-graphql';
import { ListingItemView } from '../models/ListingItem';
import { PageInfo } from './PageInfo';

@ObjectType()
export class ListingItemConnection {
  @Field()
  pageInfo: PageInfo;

  @Field(() => [ListingItemView])
  nodes: ListingItemView[];
}
