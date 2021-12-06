import { Arg, Authorized, Ctx, Mutation, Query, Resolver } from 'type-graphql';
import { AuctionItem } from '../models/AuctionItem';
import { AuctionItemPayload } from '../types/AuctionItemPayload';
import { Bided } from '../types/Bided.ts';
import { Context } from '../types/Context';
import { CountBidsPayload } from '../types/CountBids';
import { CreateAuctionItemData } from '../types/CreateAuctionItemData';

@Resolver(AuctionItem)
export class AuctionItemResolver {
  @Mutation(() => CreateAuctionItemData)
  @Authorized()
  async createAuctionItem(
    @Ctx() { auctionItemService }: Context,
    @Arg('input') { owner, nft, tokenId, startingTime, endingTime, reservePrice }: CreateAuctionItemData,
  ): Promise<CreateAuctionItemData> {
    const auctionItem = await auctionItemService.createAuctionItem({
      owner,
      nft,
      tokenId,
      startingTime,
      endingTime,
      reservePrice,
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

  @Query(() => CountBidsPayload)
  async countBids(@Ctx() { auctionItemService }: Context, @Arg('tokenId') tokenId: number): Promise<CountBidsPayload> {
    const count = await auctionItemService.countBids(tokenId);
    return count;
  }

  @Query(() => Bided)
  async haveBided(
    @Ctx() { auctionItemService }: Context,
    @Arg('auctionId') auctionId: string,
    @Arg('bidder') bidder: string,
  ): Promise<Bided> {
    const bided = await auctionItemService.haveBided(auctionId, bidder);
    return { bided };
  }
}
