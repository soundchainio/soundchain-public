import { Arg, Authorized, Ctx, Mutation, Resolver } from 'type-graphql';
import { ListingItem } from '../models/ListingItem';
import { Context } from '../types/Context';
import { CreateListingItemData } from '../types/CreateListingItemData';

@Resolver(ListingItem)
export class ListingItemResolver {
  @Mutation(() => CreateListingItemData)
  @Authorized()
  async createListingItem(
    @Ctx() { listingItemService }: Context,
    @Arg('input') { owner, nft, tokenId, quantity, pricePerItem, startingTime }: CreateListingItemData,
  ): Promise<CreateListingItemData> {
    const listingItem = await listingItemService.createListingItem({
      owner,
      nft,
      tokenId,
      quantity,
      pricePerItem,
      startingTime,
    });
    return listingItem;
  }
}
