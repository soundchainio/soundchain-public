import { Arg, Authorized, Ctx, Mutation, Query, Resolver } from 'type-graphql';
import { ListingItem } from '../models/ListingItem';
import { Context } from '../types/Context';
import { CreateListingItemData } from '../types/CreateListingItemData';
import { ListingItemPayload } from '../types/ListingItemPayload';

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

  @Query(() => ListingItemPayload)
  async listingItem(
    @Ctx() { listingItemService }: Context,
    @Arg('tokenId') tokenId: number,
  ): Promise<ListingItemPayload> {
    const listingItem = await listingItemService.findListingItem(tokenId);
    return { listingItem };
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
