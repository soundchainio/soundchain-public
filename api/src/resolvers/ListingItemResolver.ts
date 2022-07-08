import { Arg, Ctx, FieldResolver, Query, Resolver, Root } from 'type-graphql';
import { config } from '../config';
import { ListingItem } from '../models/ListingItem';
import { Context } from '../types/Context';

@Resolver(ListingItem)
export class ListingItemResolver {

  @FieldResolver(() => String)
  contract(@Root() listingItem: ListingItem): string {
    // Fallback for the old nft that didn't have this set
    return listingItem.contract || config.minting.contractsV1.marketplaceAddress as string;
  }

  @Query(() => ListingItem, { nullable: true })
  async listingItem(
    @Ctx() { listingItemService }: Context,
    @Arg('tokenId') tokenId: number,
  ): Promise<ListingItem | void> {
    return listingItemService.getListingItem(tokenId);
  }
}
