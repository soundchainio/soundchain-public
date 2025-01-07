import {
  Arg,
  Ctx,
  FieldResolver,
  Query,
  Resolver,
  Root,
} from 'type-graphql';
import { config } from '../config';
import { AuctionItem } from '../models/AuctionItem';
import { AuctionItemPayload } from '../types/AuctionItemPayload';
import { Bided } from '../types/Bided';
import { Context } from '../types/Context';
import { CountBidsPayload } from '../types/CountBids';

// Define the resolver for AuctionItem
@Resolver(AuctionItem)
export class AuctionItemResolver {
  // Resolve the `contract` field in AuctionItem
  @FieldResolver(() => String)
  contract(@Root() auctionItem: AuctionItem): string {
    // Fallback for the old NFTs that didn't have this set
    return auctionItem.contract || config.minting.contractsV1.auctionAddress as string;
  }

  // Query to fetch an auction item by tokenId
  @Query(() => AuctionItemPayload)
  async auctionItem(
    @Ctx() { auctionItemService }: Context,
    @Arg('tokenId') tokenId: number,
  ): Promise<AuctionItemPayload> {
    const auctionItem = await auctionItemService.findAuctionItem(tokenId);
    return { auctionItem };
  }

  // Query to count the number of bids for a given tokenId
  @Query(() => CountBidsPayload)
  async countBids(
    @Ctx() { auctionItemService }: Context,
    @Arg('tokenId') tokenId: number,
  ): Promise<CountBidsPayload> {
    return auctionItemService.countBids(tokenId);
  }

  // Query to check if a user has bid on an auction
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
