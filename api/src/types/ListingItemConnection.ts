import { Field, ObjectType } from 'type-graphql';
import { TrackWithListingItem } from '../models/TrackWithListingItem';
import { PageInfo } from './PageInfo';

@ObjectType()
export class ListingItemConnection {
  @Field()
  pageInfo: PageInfo;

  @Field(() => [TrackWithListingItem])
  nodes: TrackWithListingItem[];
}
