import { registerEnumType } from 'type-graphql';

enum SortListingItemField {
  PLAYBACK_COUNT = 'playbackCount',
  CREATED_AT = 'listingItem.createdAt',
  PRICE = 'listingItem.priceToShow',
}

registerEnumType(SortListingItemField, {
  name: 'SortListingItemField',
});

export { SortListingItemField };
