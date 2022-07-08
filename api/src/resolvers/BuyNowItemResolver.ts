import { Arg, Authorized, Ctx, FieldResolver, Mutation, Query, Resolver, Root } from 'type-graphql';
import { config } from '../config';
import { BuyNowItem } from '../models/BuyNowItem';
import { BuyNowPayload } from '../types/BuyNowItemPayload';
import { Context } from '../types/Context';
import { CreateBuyNowItemData } from '../types/CreateBuyNowItemData';

@Resolver(BuyNowItem)
export class BuyNowItemResolver {
  // @Mutation(() => CreateBuyNowItemData)
  // @Authorized()
  // async createBuyNowItem(
  //   @Ctx() { buyNowItemService }: Context,
  //   @Arg('input') { owner, nft, tokenId, pricePerItem, startingTime, pricePerItemToShow }: CreateBuyNowItemData,
  // ): Promise<CreateBuyNowItemData> {
  //   const buyNowItem = await buyNowItemService.createBuyNowItem({
  //     owner,
  //     nft,
  //     tokenId,
  //     pricePerItem,
  //     pricePerItemToShow,
  //     startingTime,
  //   });
  //   return buyNowItem;
  // }

  @FieldResolver(() => String)
  contract(@Root() buyNowItem: BuyNowItem): string {
    // Fallback for the old nft that didn't have this set
    return buyNowItem.contract || config.minting.contractsV1.marketplaceAddress as string;
  }

  @Query(() => BuyNowPayload)
  async buyNowItem(@Ctx() { buyNowItemService }: Context, @Arg('tokenId') tokenId: number): Promise<BuyNowPayload> {
    const buyNowItem = await buyNowItemService.findBuyNowItem(tokenId);
    return { buyNowItem };
  }

  @Mutation(() => CreateBuyNowItemData)
  @Authorized()
  async setNotValid(
    @Ctx() { buyNowItemService }: Context,
    @Arg('tokenId') tokenId: number,
  ): Promise<CreateBuyNowItemData> {
    return await buyNowItemService.setNotValid(tokenId);
  }
}
