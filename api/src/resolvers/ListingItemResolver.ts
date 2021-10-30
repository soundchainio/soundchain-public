import { Arg, Authorized, Ctx, Mutation, Query, Resolver } from 'type-graphql';
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

  @Query(() => CreateListingItemData)
  async listingItem(@Ctx() { listingItemService }: Context, @Arg('tokenId') tokenId: number): Promise<ListingItem> {
    const listingItem = await listingItemService.findListingItem(tokenId);
    return listingItem;
  }

  @Query(() => Boolean)
  async wasListedBefore(@Ctx() { listingItemService }: Context, @Arg('tokenId') tokenId: number): Promise<boolean> {
    const wasListed = await listingItemService.wasListedBefore(tokenId);
    return wasListed;
  }

  @Mutation(() => CreateListingItemData)
  @Authorized()
  async setNotValid(
    @Ctx() { listingItemService }: Context,
    @Arg('tokenId') tokenId: number,
  ): Promise<CreateListingItemData> {
    return await listingItemService.setNotValid(tokenId);
  }
}
