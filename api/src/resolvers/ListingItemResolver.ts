import { Arg, Ctx, Query, Resolver } from 'type-graphql';
import { ListingItem } from '../models/ListingItem';
import { Context } from '../types/Context';

@Resolver()
export class ListingItemResolver {
  @Query(() => ListingItem, { nullable: true })
  async listingItem(@Ctx() { listingItemService }: Context, @Arg('tokenId') tokenId: number): Promise<ListingItem> {
    return await listingItemService.getListingItem(tokenId);
  }
}
