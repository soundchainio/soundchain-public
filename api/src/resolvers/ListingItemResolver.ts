import { Arg, Ctx, Query, Resolver } from 'type-graphql';
import { ListingItemView } from '../models/ListingItem';
import { Context } from '../types/Context';
import { ListingItemConnection } from '../types/ListingItemConnection';
import { PageInput } from '../types/PageInput';
import { SortListingItemInput } from '../types/SortListingItemInput';

@Resolver(ListingItemView)
export class ListingItemResolver {
  @Query(() => ListingItemView)
  async listingItem(@Ctx() { listingItemService }: Context, @Arg('tokenId') tokenId: number): Promise<ListingItemView> {
    const listingItem = await listingItemService.getListingItem(tokenId);
    return listingItem;
  }

  @Query(() => ListingItemConnection)
  listingItemsView(
    @Ctx() { listingItemService }: Context,
    @Arg('sort', { nullable: true }) sort?: SortListingItemInput,
    @Arg('page', { nullable: true }) page?: PageInput,
  ): Promise<ListingItemConnection> {
    console.log(listingItemService);
    return listingItemService.getListingItems(sort, page);
  }
}
