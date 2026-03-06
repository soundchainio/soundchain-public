import { getModelForClass, prop } from '@typegoose/typegoose';
import { Field, ObjectType } from 'type-graphql';
import { ListingItemWithPrice } from './ListingItem';
import { Track } from './Track';

@ObjectType()
export class TrackWithListingItem extends Track {
  @Field(() => ListingItemWithPrice, { nullable: true })
  @prop()
  listingItem: ListingItemWithPrice;
}

export const TrackWithListingItemModel = getModelForClass(TrackWithListingItem);
