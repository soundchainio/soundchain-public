import { Arg, Authorized, Ctx, Mutation, Query, Resolver } from 'type-graphql';
import Web3 from 'web3';
import { BuyNowItem } from '../models/BuyNowItem';
import { BuyNowPayload } from '../types/BuyNowItemPayload';
import { Context } from '../types/Context';
import { CreateBuyNowItemData } from '../types/CreateBuyNowItemData';
import { fixedDecimals } from '../utils/format';

const getPriceToShow = (wei: string) => fixedDecimals(Web3.utils.fromWei(wei, 'ether'));
@Resolver(BuyNowItem)
export class BuyNowItemResolver {
  @Mutation(() => CreateBuyNowItemData)
  @Authorized()
  async createBuyNowItem(
    @Ctx() { buyNowItemService }: Context,
    @Arg('input') { owner, nft, tokenId, pricePerItem, OGUNPricePerItem, acceptsMATIC, acceptsOGUN, selectedCurrency, startingTime, pricePerItemToShow }: CreateBuyNowItemData,
  ): Promise<CreateBuyNowItemData> {
    const buyNowItem = await buyNowItemService.createBuyNowItem({
      owner,
      nft,
      tokenId,
      pricePerItem,
      selectedCurrency,
      pricePerItemToShow,
      OGUNPricePerItem: OGUNPricePerItem,
      OGUNPricePerItemToShow: getPriceToShow(OGUNPricePerItem),
      acceptsMATIC,
      acceptsOGUN,
      startingTime,
    });
    return buyNowItem;
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
