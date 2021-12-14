import { Arg, Ctx, Query, Resolver } from 'type-graphql';
import { ListingItem } from '../models/ListingItem';
import { Context } from '../types/Context';

@Resolver()
export class ListingItemResolver {
  @Query(() => ListingItem)
  async listingItem(@Ctx() { listingItemService }: Context, @Arg('tokenId') tokenId: number): Promise<ListingItem> {
    const listingItem = await listingItemService.getListingItem(tokenId);
    console.log({ listingItem });
    return listingItem;
  }
}
