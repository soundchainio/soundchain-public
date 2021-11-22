import { Arg, Ctx, Query, Resolver } from 'type-graphql';
import { Context } from '../types/Context';
import { ListingItemPayload } from '../types/ListingItemPayload';

@Resolver()
export class ListingItemResolver {
  @Query(() => ListingItemPayload)
  async listingItem(
    @Ctx() { listingItemService }: Context,
    @Arg('tokenId') tokenId: number,
  ): Promise<ListingItemPayload> {
    const listingItem = await listingItemService.getListingItem(tokenId);
    return listingItem;
  }
}
