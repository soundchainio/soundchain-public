import { SortListingItemField, SortOrder } from 'lib/graphql';

export enum SortListingItem {
  PriceAsc = 'PriceAsc',
  PriceDesc = 'PriceDesc',
  PlaybackCount = 'PlaybackCount',
  CreatedAt = 'CreatedAt',
}

export const SelectToApolloQuery: Record<SortListingItem, { field: SortListingItemField; order: SortOrder }> = {
  [SortListingItem.PriceAsc]: { field: SortListingItemField.Price, order: SortOrder.Asc },
  [SortListingItem.PriceDesc]: { field: SortListingItemField.Price, order: SortOrder.Desc },
  [SortListingItem.PlaybackCount]: { field: SortListingItemField.PlaybackCount, order: SortOrder.Desc },
  [SortListingItem.CreatedAt]: { field: SortListingItemField.CreatedAt, order: SortOrder.Desc },
};
