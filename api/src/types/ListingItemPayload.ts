import { Field, ObjectType } from 'type-graphql';
import { ListingItem } from '../models/ListingItem';

@ObjectType()
export class ListingItemPayload {
  @Field({ nullable: true })
  listingItem: ListingItem;
}
