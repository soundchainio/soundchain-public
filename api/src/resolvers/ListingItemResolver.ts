import { Arg, Authorized, Ctx, Mutation, Query, Resolver } from 'type-graphql';
import { ListingItem } from '../models/ListingItem';
import { Context } from '../types/Context';
import { CreateListingItemData } from '../types/CreateListingItemData';
import { IsForSaleOutput } from '../types/IsForSaleOutput';
interface IsForSale {
  is: boolean;
}
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

  @Query(() => IsForSaleOutput)
  async isForSale(@Ctx() { listingItemService }: Context, @Arg('tokenId') tokenId: number): Promise<IsForSale> {
    const is = await listingItemService.isForSale(tokenId);
    return { is };
  }
}
