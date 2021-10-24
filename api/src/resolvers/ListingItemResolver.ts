import { Arg, Authorized, Ctx, Mutation, Query, Resolver } from 'type-graphql';
import { ListingItem } from '../models/ListingItem';
import { Context } from '../types/Context';
import { CreateListingItemData } from '../types/CreateListingItemData';
import { FinishListingItemInput } from '../types/FinishListingItemInput';

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

  @Mutation(() => CreateListingItemData)
  @Authorized()
  async setNotValid(
    @Ctx() { listingItemService }: Context,
    @Arg('tokenId') tokenId: number,
  ): Promise<CreateListingItemData> {
    return await listingItemService.setNotValid(tokenId);
  }

  @Mutation(() => CreateListingItemData)
  @Authorized()
  async finishListing(
    @Ctx() { listingItemService, notificationService }: Context,
    @Arg('input') { tokenId, buyerProfileId, price, sellerProfileId, trackId }: FinishListingItemInput,
  ): Promise<CreateListingItemData> {
    await notificationService.notifyNFTSold({
      buyerProfileId,
      price,
      sellerProfileId,
      trackId,
    });

    return await listingItemService.setNotValid(tokenId);
  }
}
