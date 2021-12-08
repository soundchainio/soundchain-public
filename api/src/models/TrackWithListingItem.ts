import { getModelForClass, prop } from '@typegoose/typegoose';
import { Field, ObjectType } from 'type-graphql';
import { ListingItem } from './ListingItem';
import { Track } from './Track';

@ObjectType()
export class TrackWithListingItem extends Track {
  @Field(() => ListingItem, { nullable: true })
  @prop()
  listingItem: ListingItem;
}

export const TrackWithListingItemModel = getModelForClass(TrackWithListingItem);
