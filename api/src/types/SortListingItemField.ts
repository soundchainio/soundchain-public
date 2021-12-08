import { registerEnumType } from 'type-graphql';

enum SortListingItemField {
  PLAYBACK_COUNT = 'playbackCount',
  CREATED_AT = 'createdAt',
  PRICE = 'listing.currentPrice',
}

registerEnumType(SortListingItemField, {
  name: 'SortListingItemField',
});

export { SortListingItemField };
