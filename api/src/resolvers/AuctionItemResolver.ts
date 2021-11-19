import { Arg, Authorized, Ctx, Mutation, Query, Resolver } from 'type-graphql';
import { AuctionItem } from '../models/AuctionItem';
import { AuctionItemPayload } from '../types/AuctionItemPayload';
import { Context } from '../types/Context';
import { CreateAuctionItemData } from '../types/CreateAuctionItemData';

@Resolver(AuctionItem)
export class AuctionItemResolver {
  @Mutation(() => CreateAuctionItemData)
  @Authorized()
  async createAuctionItem(
    @Ctx() { auctionItemService }: Context,
    @Arg('input') { owner, nft, tokenId, startingTime, endingTime, reservePrice, minimumBid }: CreateAuctionItemData,
  ): Promise<CreateAuctionItemData> {
    const auctionItem = await auctionItemService.createAuctionItem({
      owner,
      nft,
      tokenId,
      startingTime,
      endingTime,
      reservePrice,
      minimumBid,
    });
    return auctionItem;
  }

  @Query(() => AuctionItemPayload)
  async auctionItem(
    @Ctx() { auctionItemService }: Context,
    @Arg('tokenId') tokenId: number,
  ): Promise<AuctionItemPayload> {
    const auctionItem = await auctionItemService.findAuctionItem(tokenId);
    return { auctionItem };
  }

  @Mutation(() => CreateAuctionItemData)
  @Authorized()
  async setNotValid(
    @Ctx() { auctionItemService }: Context,
    @Arg('tokenId') tokenId: number,
  ): Promise<CreateAuctionItemData> {
    return await auctionItemService.setNotValid(tokenId);
  }
}
