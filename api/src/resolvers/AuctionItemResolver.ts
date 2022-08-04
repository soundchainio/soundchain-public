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
    @Arg('input')
    { owner, nft, tokenId, startingTime, endingTime, reservePrice, reservePriceToShow }: CreateAuctionItemData,
  ): Promise<CreateAuctionItemData> {
    const auctionItem = await auctionItemService.createAuctionItem({
      owner,
      nft,
      tokenId,
      startingTime,
      endingTime,
      reservePrice,
      reservePriceToShow,
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

  @Query(() => CountBidsPayload)
  async countBids(@Ctx() { auctionItemService }: Context, @Arg('tokenId') tokenId: number): Promise<CountBidsPayload> {
    return auctionItemService.countBids(tokenId);
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
