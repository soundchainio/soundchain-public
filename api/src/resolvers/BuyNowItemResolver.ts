import { Arg, Ctx, FieldResolver, Query, Resolver, Root } from 'type-graphql';
import { config } from '../config';
import { BuyNowItem } from '../models/BuyNowItem';
import { BuyNowPayload } from '../types/BuyNowItemPayload';
import { Context } from '../types/Context';
import { FilterListingItemInput } from '../types/FilterListingItemInput';

@Resolver(BuyNowItem)
export class BuyNowItemResolver {
  @FieldResolver(() => String)
  contract(@Root() buyNowItem: BuyNowItem): string {
    // Fallback for the old nft that didn't have this set
    return buyNowItem.contract || config.minting.contractsV1.marketplaceAddress as string;
  }

  @Query(() => BuyNowPayload)
  async buyNowItem(@Ctx() { buyNowItemService }: Context, @Arg('input') { tokenId, contractAddress }: FilterListingItemInput): Promise<BuyNowPayload> {
    const buyNowItem = await buyNowItemService.findBuyNowItem(tokenId, contractAddress);
    return { buyNowItem };
  }
}
