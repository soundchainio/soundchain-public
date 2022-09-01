import { Arg, Ctx, FieldResolver, Query, Resolver, Root } from 'type-graphql';
import { config } from '../config';
import { AuctionItem } from '../models/AuctionItem';
import { AuctionItemPayload } from '../types/AuctionItemPayload';
import { Bided } from '../types/Bided.ts';
import { Context } from '../types/Context';
import { CountBidsPayload } from '../types/CountBids';

@Resolver(AuctionItem)
export class AuctionItemResolver {
  @FieldResolver(() => String)
  contract(@Root() auctionItem: AuctionItem): string {
    // Fallback for the old nft that didn't have this set
    return auctionItem.contract || config.minting.contractsV1.auctionAddress as string;
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
